#!/usr/bin/env bash
# Verify GitHub Discussions is enabled for brzrk-motion/Playblast (BRZ-250 gate).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPO="brzrk-motion/Playblast"
DISCUSSIONS_URL="https://github.com/${REPO}/discussions"

fail() {
  echo "error: $*" >&2
  exit 1
}

pass() {
  echo "  ✓ $*"
}

echo "Verifying GitHub Discussions for ${REPO}..."

if ! command -v gh >/dev/null 2>&1; then
  fail "gh CLI is required (install GitHub CLI and authenticate)"
fi

has_discussions="$(gh api "repos/${REPO}" --jq '.has_discussions' 2>/dev/null || echo "null")"
[[ "$has_discussions" == "true" ]] || fail "Discussions not enabled (has_discussions=${has_discussions}). Org admin: Settings → General → Features → Discussions. See docs/community/discussions-setup.md"
pass "Repository has Discussions enabled"

http_status="$(curl -s -o /dev/null -w '%{http_code}' -L "${DISCUSSIONS_URL}")"
[[ "$http_status" == "200" ]] || fail "Discussions URL returned HTTP ${http_status} (expected 200): ${DISCUSSIONS_URL}"
pass "Public Discussions URL responds: ${DISCUSSIONS_URL}"

for template in q-and-a.yml ideas.yml show-and-tell.yml; do
  [[ -f ".github/DISCUSSION_TEMPLATE/${template}" ]] || fail "Missing .github/DISCUSSION_TEMPLATE/${template}"
done
pass "Discussion category forms present"

[[ -f ".github/discussions/welcome-post.md" ]] || fail "Missing .github/discussions/welcome-post.md"
pass "Welcome post content present"

echo "GitHub Discussions verification passed."
