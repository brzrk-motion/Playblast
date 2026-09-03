#!/usr/bin/env bash
# Full Playwright E2E suite against an isolated temp DB/uploads + optional Docker bootstrap.
# Real Playwright failures fail this script. Does not print credentials or SMTP secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

step() {
  echo "==> $*"
}

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx is required for E2E" >&2
  exit 1
fi

export PLAYBLAST_E2E_PORT="${PLAYBLAST_E2E_PORT:-3199}"
export PLAYBLAST_BASE_URL="http://127.0.0.1:${PLAYBLAST_E2E_PORT}"

step "Build production artifacts"
npm run build -w shared
npm run build

step "Type-check Playwright suite"
npx tsc -p e2e/tsconfig.json

step "Run Playwright E2E suite"
npx playwright test --config e2e/playwright.config.ts

echo "Full E2E suite passed."
