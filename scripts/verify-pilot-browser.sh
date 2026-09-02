#!/usr/bin/env bash
# Session auth-boundary curl smoke. Default mode uses a local stub (deterministic;
# no secrets). Set PLAYBLAST_INSTANCE_URL or PLAYBLAST_PILOT_URL to probe a live
# instance. Does not drive a browser. Does not print credential values.
# UI checklist: docs/pilot-manual-verification.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "error: $*" >&2
  exit 1
}

assert_health() {
  local base_url="$1"
  local body_file
  local code
  local body

  body_file="$(mktemp "${TMPDIR:-/tmp}/playblast-auth-health.XXXXXX")"
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

assert_setup_status_public() {
  local base_url="$1"
  local code

  code="$(curl -sS -o /dev/null -w "%{http_code}" "${base_url}/api/setup/status")" || fail "GET /api/setup/status request failed"
  [[ "$code" == "200" ]] || fail "GET /api/setup/status expected 200, got ${code}"
  echo "  ✓ GET /api/setup/status → 200 (public)"
}

assert_unauth_api_session() {
  local base_url="$1"
  local headers
  local code

  headers="$(mktemp "${TMPDIR:-/tmp}/playblast-auth-headers.XXXXXX")"
  code="$(curl -sS -D "$headers" -o /dev/null -w "%{http_code}" "${base_url}/api/projects")" || {
    rm -f "$headers"
    fail "GET /api/projects (unauthenticated) request failed"
  }

  [[ "$code" == "401" ]] || {
    rm -f "$headers"
    fail "GET /api/projects without session expected 401, got ${code}"
  }
  if grep -qiE '^WWW-Authenticate:[[:space:]]*Basic' "$headers"; then
    rm -f "$headers"
    fail "GET /api/projects returned Basic WWW-Authenticate; expected session auth boundary"
  fi
  rm -f "$headers"
  echo "  ✓ GET /api/projects unauthenticated → 401 (no Basic challenge)"
}

run_checks() {
  local base_url="$1"

  assert_health "$base_url"
  assert_setup_status_public "$base_url"
  assert_unauth_api_session "$base_url"
}

LIVE_URL="${PLAYBLAST_INSTANCE_URL:-${PLAYBLAST_PILOT_URL:-}}"
if [[ -n "$LIVE_URL" ]]; then
  BASE_URL="${LIVE_URL%/}"
  echo "Session auth-boundary check (live): ${BASE_URL}"
  run_checks "$BASE_URL"
  echo "Session auth-boundary verification passed (live)."
  echo "Continue browser workflow checklist: docs/pilot-manual-verification.md"
  exit 0
fi

STUB_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-auth-boundary.XXXXXX")"
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

echo "Session auth-boundary check (self-check stub)..."

STUB_PORT_FILE="$STUB_PORT_FILE" \
node <<'EOF' &
import http from "node:http"
import fs from "node:fs"

const portFile = process.env.STUB_PORT_FILE

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok" }))
    return
  }

  if (req.url === "/api/setup/status") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "complete", setupComplete: true, nextRoute: "/" }))
    return
  }

  if ((req.url || "").startsWith("/api")) {
    res.writeHead(401, { "Content-Type": "application/json" })
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

run_checks "$BASE_URL"
echo "Session auth-boundary verification passed (self-check)."
echo "Live instance: PLAYBLAST_INSTANCE_URL=http://<host>:3000 npm run verify:pilot-browser"
echo "Browser workflow checklist: docs/pilot-manual-verification.md"
