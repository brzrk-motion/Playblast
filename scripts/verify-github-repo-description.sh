#!/usr/bin/env bash
# Verify package.json and the public GitHub repo description match OSC positioning.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPO="${GITHUB_REPOSITORY:-brzrk-motion/Playblast}"

fail() {
  echo "error: $*" >&2
  exit 1
}

pass() {
  echo "  ✓ $*"
}

echo "Verifying GitHub repository description for OSC readiness..."

if ! command -v node >/dev/null 2>&1; then
  fail "node is required to read package.json"
fi

expected="$(node -p "require('./package.json').description || ''")"
[[ -n "$expected" ]] || fail 'package.json is missing a non-empty "description" field'

if printf '%s' "$expected" | grep -Eiq 'in[ -]?house|internal'; then
  fail 'package.json description must not use "in house" or "internal" framing'
fi
pass "package.json description is set and avoids internal framing"

actual="$(curl -fsSL "https://api.github.com/repos/${REPO}" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).description || ''")"

[[ -n "$actual" ]] || fail "GitHub repo description is empty (expected: $expected)"
if [[ "$actual" != "$expected" ]]; then
  fail "$(printf 'GitHub repo description mismatch.\n  expected: %s\n  actual:   %s' "$expected" "$actual")"
fi

if printf '%s' "$actual" | grep -Eiq 'in[ -]?house|internal'; then
  fail 'GitHub repo description must not use "in house" or "internal" framing'
fi
pass "public GitHub description matches package.json"

echo "GitHub repository description verification passed."
