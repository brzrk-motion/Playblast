#!/usr/bin/env bash
# Scan tracked source for accidental secret commits. Never reads .env files.
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

echo "Scanning repository for accidental secret patterns..."

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  TRACKED="$(git ls-files)"
else
  TRACKED="$(find . -type f \
    ! -path './node_modules/*' \
    ! -path './.git/*' \
    ! -path './client/dist/*' \
    ! -path './server/dist/*' \
    ! -path './deploy/*')"
fi

scan_pattern() {
  local label="$1"
  local pattern="$2"
  local matches
  matches="$(echo "$TRACKED" | while read -r file; do
    [[ -f "$file" ]] || continue
    case "$file" in
      *.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.mp4|*.mov|*.tar|*.tar.gz|*.zip|package-lock.json)
        continue
        ;;
    esac
    if grep -nE "$pattern" "$file" 2>/dev/null; then
      echo "$file"
    fi
  done | sort -u)"

  if [[ -n "$matches" ]]; then
    echo "Potential $label matches (review required):"
    echo "$matches" | sed 's/^/    /'
    fail "secret scan found suspicious $label patterns"
  fi
  pass "no $label patterns in tracked sources"
}

scan_pattern "private key" 'BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY'
scan_pattern "AWS access key" 'AKIA[0-9A-Z]{16}'

# Explicit .env files must not be tracked
if echo "$TRACKED" | grep -qx '\.env'; then
  fail ".env is tracked by git"
fi
if echo "$TRACKED" | grep -qx 'docker-compose\.env'; then
  fail "docker-compose.env is tracked by git"
fi
pass "no committed .env or docker-compose.env files"

# Example files may document variable names but must not contain live secrets
for example in .env.example docker-compose.env.example; do
  [[ -f "$example" ]] || fail "$example is missing"
  if grep -qE '^(SESSION_SECRET|SMTP_PASS|PLAYBLAST_ADMIN_RECOVERY_TOKEN)=' "$example"; then
    if grep -qE '^(SESSION_SECRET|SMTP_PASS|PLAYBLAST_ADMIN_RECOVERY_TOKEN)=(replace-with|<|your-|changeme|example)' "$example"; then
      :
    elif grep -qE '^(SESSION_SECRET|SMTP_PASS|PLAYBLAST_ADMIN_RECOVERY_TOKEN)=[^[:space:]/]+' "$example"; then
      fail "$example appears to contain a non-placeholder secret value"
    fi
  fi
done
pass "env example files contain placeholders only"

echo "Secret scan passed."
