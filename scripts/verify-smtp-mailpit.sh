#!/usr/bin/env bash
# Prove SMTP test-send delivers into Mailpit in CI — real transport, not unit mocks.
# Requires Docker. Never uses production SMTP hosts or prints secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || fail "${name} is required"
}

require_command docker
require_command curl
require_command node

if ! docker info >/dev/null 2>&1; then
  fail "docker daemon is unavailable; Mailpit SMTP proof requires Docker"
fi

# --- Guard: this job must never use production SMTP relays ---
FORBIDDEN_SMTP_HOST="${SMTP_HOST:-}"
FORBIDDEN_SMTP_PORT="${SMTP_PORT:-}"
case "${FORBIDDEN_SMTP_HOST,,}" in
  ""|127.0.0.1|localhost|::1|mailpit) ;;
  *)
    fail "SMTP_HOST must point at Mailpit (127.0.0.1/localhost/mailpit), not '${FORBIDDEN_SMTP_HOST}'"
    ;;
esac
[[ "${FORBIDDEN_SMTP_PORT}" == "1025" ]] || fail "SMTP_PORT must be 1025 for Mailpit, not '${FORBIDDEN_SMTP_PORT}'"

export NODE_ENV="${NODE_ENV:-development}"
[[ "${NODE_ENV}" == "production" ]] && fail "NODE_ENV must not be production for Mailpit SMTP proof"

export SMTP_HOST="${SMTP_HOST:-127.0.0.1}"
export SMTP_PORT="${SMTP_PORT:-1025}"
export SMTP_SECURE="${SMTP_SECURE:-false}"
export SMTP_USER="${SMTP_USER:-ci}"
export SMTP_PASS="${SMTP_PASS:-ci}"
export SMTP_FROM="${SMTP_FROM:-noreply@playblast.local}"
export MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:8025}"
export SESSION_SECRET="${SESSION_SECRET:-ci-smtp-mailpit-test-secret-32chars}"

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-smtp-mailpit.XXXXXX")"
export DB_PATH="$WORK_DIR/data/playblast.db"
export UPLOAD_DIR="$WORK_DIR/uploads"
export PORT="${PORT:-3099}"
export HOST="127.0.0.1"
export PLAYBLAST_INSTANCE_URL="${PLAYBLAST_INSTANCE_URL:-http://127.0.0.1:${PORT}}"

MAILPIT_CONTAINER="playblast-mailpit-ci-$$"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  docker rm -f "$MAILPIT_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$UPLOAD_DIR" "$(dirname "$DB_PATH")"

echo "Starting Mailpit (axllent/mailpit)..."
docker run -d \
  --name "$MAILPIT_CONTAINER" \
  -p "1025:1025" \
  -p "8025:8025" \
  axllent/mailpit >/dev/null

echo "Waiting for Mailpit /readyz..."
for _ in $(seq 1 60); do
  if curl -fsS "${MAILPIT_URL}/readyz" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "${MAILPIT_URL}/readyz" >/dev/null || fail "Mailpit /readyz did not become ready"

echo "Building shared and server..."
npm run build -w shared
npm run build -w server

echo "Starting Playblast server..."
node server/dist/index.js &
SERVER_PID=$!

BASE_URL="http://127.0.0.1:${PORT}"
echo "Waiting for ${BASE_URL}/health..."
for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/health" 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  sleep 1
done
curl -fsS "${BASE_URL}/health" | grep -q '"status":"ok"' || fail "server /health did not report ok"

echo "Triggering SMTP test-send and asserting Mailpit capture..."
node --input-type=module <<'EOF'
import assert from "node:assert/strict"

const baseUrl = process.env.PLAYBLAST_INSTANCE_URL
const mailpitUrl = process.env.MAILPIT_URL
const devAdminEmail = "admin@playblast.local"
const devAdminPassword = "PlayblastDev2026"
const customAdminEmail = "smtp-ci-admin@playblast.local"
const customAdminPassword = "smtp ci admin password ok 99"

function collectSetCookies(response) {
  const headers = response.headers
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }
  const single = headers.get("set-cookie")
  return single ? [single] : []
}

function cookieHeader(cookies) {
  return cookies.map((entry) => entry.split(";")[0]).join("; ")
}

function authHeaders(cookies, csrfToken) {
  return {
    "Content-Type": "application/json",
    Cookie: cookieHeader(cookies),
    "X-CSRF-Token": csrfToken,
  }
}

async function waitForMailpitMessage(recipient, subject) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const listResponse = await fetch(`${mailpitUrl}/api/v1/messages`)
    assert.equal(listResponse.status, 200, "Mailpit messages list failed")
    const list = await listResponse.json()
    const match = (list.messages ?? []).find((message) => {
      const to = (message.To ?? [])
        .map((entry) => entry.Address?.toLowerCase?.() ?? "")
        .join(",")
      return to.includes(recipient.toLowerCase()) && message.Subject === subject
    })
    if (match?.ID) {
      const detailResponse = await fetch(`${mailpitUrl}/api/v1/message/${match.ID}`)
      assert.equal(detailResponse.status, 200, "Mailpit message detail failed")
      return detailResponse.json()
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for Mailpit message to ${recipient} with subject '${subject}'`)
}

async function authenticateAdmin() {
  const setupStatusResponse = await fetch(`${baseUrl}/api/setup/status`)
  assert.equal(setupStatusResponse.status, 200, "setup status failed")
  const setupStatus = await setupStatusResponse.json()

  if (setupStatus.status === "pending") {
    const setupResponse = await fetch(`${baseUrl}/api/setup/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "SMTP CI Admin",
        email: customAdminEmail,
        password: customAdminPassword,
        confirmPassword: customAdminPassword,
      }),
    })
    assert.equal(setupResponse.status, 201, "admin setup failed")
    const session = await setupResponse.json()
    const cookies = collectSetCookies(setupResponse)
    const csrfToken = session.csrfToken

    const studioResponse = await fetch(`${baseUrl}/api/studio`, {
      method: "PATCH",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({ name: "SMTP CI Studio" }),
    })
    assert.equal(studioResponse.status, 200, "studio patch failed")

    const completeResponse = await fetch(`${baseUrl}/api/setup/complete`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
    })
    assert.equal(completeResponse.status, 200, "setup complete failed")

    return { cookies, csrfToken, recipientEmail: customAdminEmail }
  }

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: devAdminEmail,
      password: devAdminPassword,
    }),
  })
  assert.equal(loginResponse.status, 200, "dev admin login failed")
  const session = await loginResponse.json()
  return {
    cookies: collectSetCookies(loginResponse),
    csrfToken: session.csrfToken,
    recipientEmail: devAdminEmail,
  }
}

const { cookies, csrfToken, recipientEmail } = await authenticateAdmin()

const testResponse = await fetch(`${baseUrl}/api/smtp/test`, {
  method: "POST",
  headers: authHeaders(cookies, csrfToken),
  body: JSON.stringify({ recipientEmail }),
})
assert.equal(testResponse.status, 200, `SMTP test-send failed: ${await testResponse.text()}`)

const subject = "Playblast SMTP test"
const message = await waitForMailpitMessage(recipientEmail, subject)

const recipients = (message.To ?? []).map((entry) => entry.Address?.toLowerCase?.() ?? "")
assert.ok(
  recipients.some((address) => address === recipientEmail.toLowerCase()),
  `Mailpit To did not include ${recipientEmail}`,
)
assert.equal(message.Subject, subject, "Mailpit subject mismatch")

const expectedSnippet = "test message from your self-hosted Playblast instance"
assert.match(message.Text ?? "", new RegExp(expectedSnippet, "i"), "Mailpit text body mismatch")
assert.match(message.HTML ?? "", new RegExp(expectedSnippet, "i"), "Mailpit HTML body mismatch")

const instanceUrl = process.env.PLAYBLAST_INSTANCE_URL
assert.ok(instanceUrl, "PLAYBLAST_INSTANCE_URL must be set for invitation link generation")
assert.ok(message.ID, "Mailpit message detail link/id missing")

console.log("  ✓ SMTP test-send captured in Mailpit")
console.log(`  ✓ To=${recipientEmail}`)
console.log(`  ✓ Subject=${subject}`)
console.log(`  ✓ Body contains expected test copy`)
console.log(`  ✓ Mailpit message detail retrieved (${message.ID})`)
console.log(`  ✓ Instance URL configured: ${instanceUrl}`)
EOF

echo "Mailpit SMTP test-send verification passed."
