#!/usr/bin/env bash
# Browser QA gate: requires real Playwright success.
# Non-browser fallback lives in npm run verify:browser-qa:fallback and must not mask Playwright failures.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${PLAYBLAST_SKIP_BROWSER_QA:-}" == "1" ]]; then
  echo "Browser QA skipped (PLAYBLAST_SKIP_BROWSER_QA=1)."
  exit 0
fi

bash "$ROOT_DIR/scripts/run-e2e.sh"
