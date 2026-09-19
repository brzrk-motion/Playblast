#!/usr/bin/env bash
# T7 Soft-RC clean-install gate: fresh volumes → setup → login → project → upload stub → comment.
# Runs a production server on ephemeral DB/uploads (no Docker required).
# When Docker is available, also runs verify:docker-deployment for container parity.
# Never prints secret values.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PLAYBLAST_CLEAN_INSTALL_PORT:-3099}"
BASE_URL="http://127.0.0.1:${PORT}"
EVIDENCE_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "==> T7 clean-install verification (${EVIDENCE_DATE} UTC)"
echo "==> Build production artifacts"
npm run build

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-clean-install.XXXXXX")"
DB_PATH="$TEMP_DIR/playblast.db"
UPLOAD_DIR="$TEMP_DIR/uploads"
mkdir -p "$UPLOAD_DIR"

export DB_PATH UPLOAD_DIR
export PLAYBLAST_E2E_TEST_MODE="1"
export SESSION_SECRET="clean-install-smoke-secret-32chars"
export NODE_ENV="production"
export PORT
export PLAYBLAST_BASE_URL="$BASE_URL"
unset SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM SMTP_REPLY_TO

echo "==> Start Playblast on fresh volumes at ${BASE_URL}"
node server/dist/e2e-entry.js &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl -sf "${BASE_URL}/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "error: server exited before health check" >&2
    exit 1
  fi
  sleep 0.5
done

echo "==> Run clean-install API smoke"
npx tsx e2e/clean-install-smoke.ts

DOCKER_RESULT="skipped (daemon unavailable)"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "==> Docker available — run container clean-install metadata check"
  if npm run verify:docker-deployment; then
    DOCKER_RESULT="passed"
  else
    echo "error: Docker deployment verification failed" >&2
    exit 1
  fi
else
  echo "note: Docker unavailable — container clean-install check skipped (not Gate closure)."
fi

echo ""
echo "Clean install verification passed."
echo "  evidence_date: ${EVIDENCE_DATE}"
echo "  filesystem_smoke: passed (${BASE_URL})"
echo "  docker_smoke: ${DOCKER_RESULT}"
echo "  record results in docs/soft-rc/t7-clean-install-evidence.md"
