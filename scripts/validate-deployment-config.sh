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
for var in \
  PORT \
  NODE_ENV \
  UPLOAD_DIR \
  DB_PATH \
  MAX_UPLOAD_SIZE \
  SESSION_SECRET \
  SESSION_TTL_HOURS \
  PLAYBLAST_EMERGENCY_BASIC_AUTH \
  PLAYBLAST_AUTH_USER \
  PLAYBLAST_AUTH_PASSWORD \
  PLAYBLAST_ADMIN_RECOVERY_TOKEN \
  VITE_DEFAULT_VIDEO_FPS
do
  grep -q "$var" .env.example || fail ".env.example must document $var"
done
pass ".env.example documents all server and client runtime variables"

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

[[ -f scripts/build-deploy.sh ]] || fail "scripts/build-deploy.sh is missing"
grep -q 'IMAGE_NAME="\${IMAGE_NAME:-playblast:latest}"' scripts/build-deploy.sh \
  || fail "build-deploy.sh must default IMAGE_NAME to playblast:latest"
if grep -q 'brzrk/playblast:latest' scripts/build-deploy.sh; then
  fail "build-deploy.sh must not default to brzrk/playblast:latest"
fi
pass "build-deploy.sh defaults IMAGE_NAME to playblast:latest"

[[ -f docs/deployment/index.md ]] || fail "docs/deployment/index.md is missing"
pass "deployment documentation index exists"

[[ -f docs/deployment/image-publish.md ]] || fail "image publish documentation is missing"
pass "image publish documentation exists"

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

[[ -f docs/deployment/tls-proxy.md ]] || fail "TLS/reverse-proxy documentation is missing"
pass "TLS/reverse-proxy documentation exists"

[[ -f docker-compose.proxy.yml ]] || fail "docker-compose.proxy.yml overlay is missing"
pass "docker-compose.proxy.yml overlay exists"

[[ -f deploy/caddy/Caddyfile ]] || fail "deploy/caddy/Caddyfile is missing"
pass "Caddyfile for TLS overlay exists"

[[ -f docs-site/.vitepress/config.ts ]] || fail "docs-site VitePress config is missing"
grep -q "link: '/deployment/image-publish'" docs-site/.vitepress/config.ts \
  || fail "docs-site sidebar must include image-publish"
grep -q "link: '/deployment/tls-proxy'" docs-site/.vitepress/config.ts \
  || fail "docs-site sidebar must include tls-proxy"
pass "docs-site sidebar includes image-publish and tls-proxy"

[[ -f CHANGELOG.md ]] || fail "CHANGELOG.md is missing"
pass "CHANGELOG.md exists"

[[ -f SECURITY.md ]] || fail "SECURITY.md is missing"
pass "SECURITY.md exists"

[[ -f docs/release/README.md ]] || fail "docs/release/README.md is missing"
pass "release documentation exists"

echo "Deployment configuration validation passed."
