#!/usr/bin/env bash
# Non-browser deterministic QA fallback (fetch + bundle markers).
# Not a substitute for Playwright; use only when explicitly requesting fallback coverage.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${PLAYBLAST_SKIP_BROWSER_QA:-}" == "1" ]]; then
  echo "Browser QA fallback skipped (PLAYBLAST_SKIP_BROWSER_QA=1)."
  exit 0
fi

PORT="${PLAYBLAST_BROWSER_QA_PORT:-3098}"
BASE_URL="http://127.0.0.1:${PORT}"

echo "==> Build production artifacts"
npm run build -w shared
npm run build

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-browser-qa-fallback.XXXXXX")"
DB_PATH="$TEMP_DIR/playblast.db"
UPLOAD_DIR="$TEMP_DIR/uploads"
SMTP_DIR="$TEMP_DIR/smtp-capture"
mkdir -p "$UPLOAD_DIR" "$SMTP_DIR"

export DB_PATH UPLOAD_DIR
export PLAYBLAST_E2E_TEST_MODE="1"
export PLAYBLAST_SMTP_CAPTURE_DIR="$SMTP_DIR"
export SESSION_SECRET="browser-qa-fallback-secret-32chars"
export NODE_ENV="production"
export PORT
export PLAYBLAST_BASE_URL="$BASE_URL"

echo "==> Start Playblast server on ${BASE_URL}"
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

echo "==> Seed fixture users"
npx tsx e2e/fixture.ts

echo "==> Run deterministic non-browser QA"
npx tsx e2e/deterministic-browser-qa.ts
echo "Deterministic browser QA fallback passed."
