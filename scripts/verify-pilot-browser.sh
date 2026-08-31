#!/usr/bin/env bash
# Auth-boundary smoke for the private pilot. Default mode spins an ephemeral
# local stub (deterministic; no real URL or secrets). Set PLAYBLAST_PILOT_URL
# plus PLAYBLAST_AUTH_USER / PLAYBLAST_AUTH_PASSWORD to hit a live pilot.
#
# Does not drive a browser. Does not print credential values.
# Remaining UI steps: docs/pilot-manual-verification.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REALM='Basic realm="Playblast pilot"'
STUB_USER="pilot-selfcheck"
STUB_PASSWORD="pilot-selfcheck-password"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required" >&2
  exit 1
fi

fail() {
  echo "error: $*" >&2
  exit 1
}

assert_health() {
  local base_url="$1"
  local body_file
  local code
  local body

  body_file="$(mktemp "${TMPDIR:-/tmp}/playblast-pilot-health.XXXXXX")"
  code="$(curl -sS -o "$body_file" -w "%{http_code}" "${base_url}/health")" || {
    rm -f "$body_file"
    fail "GET /health request failed"
  }
  body="$(cat "$body_file")"
  rm -f "$body_file"

  [[ "$code" == "200" ]] || fail "GET /health expected 200, got ${code}"
  [[ "$body" == *'"status":"ok"'* || "$body" == *'"status": "ok"'* ]] || fail "GET /health body missing status ok"
  echo "  ✓ GET /health → 200 status ok"
}

assert_unauth_api() {
  local base_url="$1"
  local headers
  local code

  headers="$(mktemp "${TMPDIR:-/tmp}/playblast-pilot-headers.XXXXXX")"
  code="$(curl -sS -D "$headers" -o /dev/null -w "%{http_code}" "${base_url}/api/projects")" || {
    rm -f "$headers"
    fail "GET /api/projects (unauthenticated) request failed"
  }

  [[ "$code" == "401" ]] || {
    rm -f "$headers"
    fail "GET /api/projects without auth expected 401, got ${code}"
  }
  grep -qiE "^WWW-Authenticate:[[:space:]]*Basic realm=\"Playblast pilot\"" "$headers" || {
    rm -f "$headers"
    fail "missing WWW-Authenticate: ${REALM}"
  }
  rm -f "$headers"
  echo "  ✓ GET /api/projects unauthenticated → 401 + Basic realm"
}

assert_auth_api() {
  local base_url="$1"
  local user="$2"
  local password="$3"
  local code

  code="$(curl -sS -o /dev/null -w "%{http_code}" -u "${user}:${password}" "${base_url}/api/projects")" || fail "GET /api/projects (authenticated) request failed"
  [[ "$code" == "200" ]] || fail "GET /api/projects with credentials expected 200, got ${code}"
  echo "  ✓ GET /api/projects authenticated → 200"
}

run_checks() {
  local base_url="$1"
  local user="$2"
  local password="$3"

  assert_health "$base_url"
  assert_unauth_api "$base_url"
  assert_auth_api "$base_url" "$user" "$password"
}

if [[ -n "${PLAYBLAST_PILOT_URL:-}" ]]; then
  [[ -n "${PLAYBLAST_AUTH_USER:-}" ]] || fail "PLAYBLAST_AUTH_USER is required when PLAYBLAST_PILOT_URL is set"
  [[ -n "${PLAYBLAST_AUTH_PASSWORD:-}" ]] || fail "PLAYBLAST_AUTH_PASSWORD is required when PLAYBLAST_PILOT_URL is set"

  BASE_URL="${PLAYBLAST_PILOT_URL%/}"
  echo "Pilot browser auth-boundary check (live): ${BASE_URL}"
  echo "  (credentials present; values not printed)"
  run_checks "$BASE_URL" "$PLAYBLAST_AUTH_USER" "$PLAYBLAST_AUTH_PASSWORD"
  echo "Pilot browser auth-boundary verification passed (live)."
  echo "Continue browser workflow checklist: docs/pilot-manual-verification.md"
  exit 0
fi

STUB_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-pilot-browser.XXXXXX")"
STUB_PORT_FILE="$STUB_DIR/port"
STUB_PID=""

cleanup() {
  if [[ -n "$STUB_PID" ]] && kill -0 "$STUB_PID" 2>/dev/null; then
    kill "$STUB_PID" 2>/dev/null || true
    wait "$STUB_PID" 2>/dev/null || true
  fi
  rm -rf "$STUB_DIR"
}
trap cleanup EXIT

echo "Pilot browser auth-boundary check (self-check stub)..."

STUB_USER="$STUB_USER" \
STUB_PASSWORD="$STUB_PASSWORD" \
STUB_PORT_FILE="$STUB_PORT_FILE" \
node <<'EOF' &
import http from "node:http"
import fs from "node:fs"

const user = process.env.STUB_USER
const password = process.env.STUB_PASSWORD
const portFile = process.env.STUB_PORT_FILE
const expected =
  "Basic " + Buffer.from(`${user}:${password}`, "utf8").toString("base64")

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok" }))
    return
  }

  if ((req.url || "").startsWith("/api")) {
    const auth = req.headers.authorization
    if (auth === expected) {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end("[]")
      return
    }
    res.writeHead(401, {
      "Content-Type": "application/json",
      "WWW-Authenticate": 'Basic realm="Playblast pilot"',
    })
    res.end(JSON.stringify({ error: "Authentication required" }))
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(0, "127.0.0.1", () => {
  const addr = server.address()
  if (!addr || typeof addr === "string") {
    process.exit(1)
  }
  fs.writeFileSync(portFile, String(addr.port))
})
EOF
STUB_PID=$!

for _ in $(seq 1 50); do
  if [[ -f "$STUB_PORT_FILE" ]]; then
    break
  fi
  sleep 0.05
done

[[ -f "$STUB_PORT_FILE" ]] || fail "stub server did not publish a port"
STUB_PORT="$(cat "$STUB_PORT_FILE")"
BASE_URL="http://127.0.0.1:${STUB_PORT}"

run_checks "$BASE_URL" "$STUB_USER" "$STUB_PASSWORD"
echo "Pilot browser auth-boundary verification passed (self-check)."
echo "Live pilot: PLAYBLAST_PILOT_URL=... PLAYBLAST_AUTH_USER=... PLAYBLAST_AUTH_PASSWORD=... npm run verify:pilot-browser"
echo "Browser workflow checklist: docs/pilot-manual-verification.md"
