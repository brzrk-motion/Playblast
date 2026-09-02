#!/usr/bin/env bash
# Static deployment configuration checks. Does not require Docker.
# Never reads or prints secret values from .env files.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "error: $*" >&2
  exit 1
}

pass() {
  echo "  ✓ $*"
}

echo "Validating deployment configuration..."

[[ -f Dockerfile ]] || fail "Dockerfile is missing"
grep -q 'FROM node:22-alpine' Dockerfile || fail "Dockerfile must use node:22-alpine"
pass "Dockerfile uses Node 22 Alpine"

[[ -f docker-compose.yml ]] || fail "docker-compose.yml is missing"
grep -q 'SESSION_SECRET' docker-compose.yml || fail "docker-compose.yml must require SESSION_SECRET"
if grep -q 'PLAYBLAST_AUTH_USER: \${PLAYBLAST_AUTH_USER:\?Set PLAYBLAST_AUTH_USER}' docker-compose.yml; then
  fail "docker-compose.yml must not require PLAYBLAST_AUTH_USER as primary auth"
fi
pass "docker-compose.yml requires SESSION_SECRET, not Basic Auth"

[[ -f docker-compose.env.example ]] || fail "docker-compose.env.example is missing"
grep -q 'SESSION_SECRET=' docker-compose.env.example || fail "docker-compose.env.example must document SESSION_SECRET"
pass "docker-compose.env.example documents SESSION_SECRET"

[[ -f .env.example ]] || fail ".env.example is missing"
grep -q 'SESSION_SECRET' .env.example || fail ".env.example must document SESSION_SECRET"
pass ".env.example documents SESSION_SECRET"

node -e "
const pkg = require('./package.json');
if (!pkg.engines?.node) {
  throw new Error('package.json must declare engines.node');
}
if (!pkg.engines.node.includes('22')) {
  throw new Error('package.json engines.node must require Node 22+');
}
" || fail "package.json engines.node must require Node 22+"
pass "package.json engines.node requires Node 22+"

[[ -f docs/deployment/README.md ]] || fail "docs/deployment/README.md is missing"
pass "deployment documentation index exists"

[[ -f docs/deployment/operator-responsibilities.md ]] || fail "operator responsibilities doc is missing"
pass "operator responsibilities documentation exists"

[[ -f docs/deployment/migrations.md ]] || fail "migrations documentation is missing"
pass "migration documentation exists"

[[ -f docs/deployment/backup-restore.md ]] || fail "backup/restore documentation is missing"
pass "backup/restore documentation exists"

[[ -f docs/deployment/secrets.md ]] || fail "secrets documentation is missing"
pass "secrets documentation exists"

[[ -f docs/deployment/onboarding-walkthrough.md ]] || fail "onboarding walkthrough is missing"
pass "onboarding walkthrough exists"

echo "Deployment configuration validation passed."
