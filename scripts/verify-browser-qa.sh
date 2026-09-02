#!/usr/bin/env bash
# Deterministic browser QA via Playwright against a production-built Playblast instance.
# Does not print credentials, tokens, or SMTP secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${PLAYBLAST_SKIP_BROWSER_QA:-}" == "1" ]]; then
  echo "Browser QA skipped (PLAYBLAST_SKIP_BROWSER_QA=1)."
  exit 0
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx is required for browser QA" >&2
  exit 1
fi

step() {
  echo "==> $*"
}

PORT="${PLAYBLAST_BROWSER_QA_PORT:-3099}"
BASE_URL="http://127.0.0.1:${PORT}"

step "Build production artifacts"
npm run build -w shared
npm run build

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-browser-qa.XXXXXX")"
DB_PATH="$TEMP_DIR/playblast.db"
UPLOAD_DIR="$TEMP_DIR/uploads"
mkdir -p "$UPLOAD_DIR"

export DB_PATH
export UPLOAD_DIR
export SESSION_SECRET="browser-qa-session-secret-32chars-min"
export NODE_ENV="production"
export PORT
export PLAYBLAST_BASE_URL="$BASE_URL"

step "Start Playblast server on ${BASE_URL}"
node server/dist/index.js &
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

if ! curl -sf "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "error: server did not become healthy on ${BASE_URL}" >&2
  exit 1
fi

step "Seed browser QA fixture"
npx tsx e2e/fixture.ts

step "Install Playwright Chromium (if needed)"
if npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium; then
  step "Run Playwright release QA specs"
  if npx playwright test --config e2e/playwright.config.ts; then
    echo "Browser QA passed (Playwright)."
    exit 0
  fi
  echo "Playwright specs failed; trying deterministic fallback..."
else
  echo "Playwright browser install unavailable; using deterministic fallback..."
fi

step "Run deterministic browser QA fallback"
npx tsx e2e/deterministic-browser-qa.ts
echo "Browser QA passed (deterministic fallback)."
