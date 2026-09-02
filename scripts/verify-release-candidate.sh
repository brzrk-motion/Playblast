#!/usr/bin/env bash
# Phase 8 release-candidate verification gate.
# Runs canonical checks without printing secrets from .env files.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SKIP_DOCKER="${SKIP_DOCKER:-0}"
SKIP_BROWSER="${SKIP_BROWSER:-0}"
SKIP_AUDIT="${SKIP_AUDIT:-0}"

fail() {
  echo "error: $*" >&2
  exit 1
}

step() {
  echo ""
  echo "==> $*"
}

step "Shared contract build"
npm run build -w shared

step "Server, client, and shared tests"
npm run test

step "Production build"
npm run build

step "Client lint"
npm run lint

if [[ "$SKIP_AUDIT" != "1" ]]; then
  step "Dependency audit (production)"
  npm audit --omit=dev --audit-level=high
else
  echo "  (skipped: SKIP_AUDIT=1)"
fi

step "Secret scan"
bash scripts/verify-secrets-in-repo.sh

step "Deployment configuration"
bash scripts/validate-deployment-config.sh

step "Backup and restore gate"
npm run verify:backup-restore

step "Auth-boundary smoke"
npm run verify:pilot-browser

if command -v docker >/dev/null 2>&1 && [[ "$SKIP_DOCKER" != "1" ]]; then
  step "Docker Compose config"
  bash scripts/validate-docker-compose.sh

  step "Docker deployment smoke"
  npm run verify:docker-deployment
else
  echo ""
  echo "==> Docker gates skipped (daemon unavailable or SKIP_DOCKER=1)"
fi

if [[ "$SKIP_BROWSER" != "1" ]]; then
  step "Browser QA"
  bash scripts/verify-browser-qa.sh
else
  echo ""
  echo "==> Browser QA skipped (SKIP_BROWSER=1)"
fi

echo ""
echo "Release candidate verification passed."
echo "Manual / external gates still required:"
echo "  - Cross-browser desktop QA on Chrome, Firefox, Safari, Edge"
echo "  - Clean-machine install from docs/deployment only"
echo "  - Live SMTP delivery to a real mailbox"
echo "  - Self-hosted adopter recruitment and funding evidence (see docs/release/README.md)"
