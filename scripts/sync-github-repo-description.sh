#!/usr/bin/env bash
# Push package.json description to the GitHub repository About field (requires admin).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPO="${GITHUB_REPOSITORY:-brzrk-motion/Playblast}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is required" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required" >&2
  exit 1
fi

description="$(node -p "require('./package.json').description || ''")"
[[ -n "$description" ]] || {
  echo "error: package.json is missing a non-empty description field" >&2
  exit 1
}

echo "Updating GitHub description for ${REPO}..."
gh repo edit "$REPO" --description "$description"
echo "Done. Run npm run verify:github-repo-description to confirm."
