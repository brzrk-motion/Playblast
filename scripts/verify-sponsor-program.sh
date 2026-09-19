#!/usr/bin/env bash
# Sponsor program ready-check (BRZ-228). Verifies repo sponsor docs and that
# brzrkmotion.com/fund stays soft (no live checkout). GitHub Sponsors enable is
# a James gate — reported as gate items, not blocking soft-fund checks.
#
# Manual checklist: docs/sponsor-program-ready-check.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FUND_URL="${PLAYBLAST_FUND_URL:-https://brzrkmotion.com/fund}"
PRODUCT_URL="${PLAYBLAST_PRODUCT_URL:-https://brzrkmotion.com/playblast}"
SPONSORS_PROFILE_URL="${PLAYBLAST_SPONSORS_URL:-https://github.com/sponsors/brzrk-motion}"
ORG_PROFILE_URL="${PLAYBLAST_ORG_URL:-https://github.com/brzrk-motion}"

GATE_COUNT=0
FAIL_COUNT=0

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

fail() {
  echo "error: $*" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

gate() {
  echo "gate: $*" >&2
  GATE_COUNT=$((GATE_COUNT + 1))
}

pass() {
  echo "  ✓ $*"
}

assert_file_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"

  [[ -f "$file" ]] || {
    fail "${label}: missing file ${file}"
    return
  }
  grep -qF "$needle" "$file" || fail "${label}: expected content not found in ${file}"
  pass "$label"
}

fetch_body() {
  local url="$1"
  local out="$2"
  local code

  code="$(curl -sS -L -o "$out" -w "%{http_code}" "$url")" || {
    fail "request failed for ${url}"
    return 1
  }
  echo "$code"
}

echo "Sponsor program ready-check (BRZ-228)"
echo "  Fund URL:     ${FUND_URL}"
echo "  Product URL:  ${PRODUCT_URL}"
echo ""

echo "Repo sponsor docs..."
assert_file_contains "SPONSORS.md" "brzrk-motion" "SPONSORS.md references org"
assert_file_contains "SPONSORS.md" "no support SLA" "SPONSORS.md support boundary"
assert_file_contains ".github/FUNDING.yml" "github: [brzrk-motion]" "FUNDING.yml org target"
assert_file_contains ".github/FUNDING.yml" "GitHub Sponsors must be enabled" "FUNDING.yml enable comment"
assert_file_contains "docs/deployment/operator-responsibilities.md" "No-support boundary" "operator-responsibilities.md present"

echo ""
echo "Public surfaces..."

FUND_HTML="$(mktemp "${TMPDIR:-/tmp}/playblast-fund.XXXXXX")"
FUND_CODE="$(fetch_body "$FUND_URL" "$FUND_HTML")"
if [[ "$FUND_CODE" == "200" ]]; then
  pass "GET ${FUND_URL} → 200"
else
  fail "GET ${FUND_URL} expected 200, got ${FUND_CODE}"
fi

PRODUCT_HTML="$(mktemp "${TMPDIR:-/tmp}/playblast-product.XXXXXX")"
PRODUCT_CODE="$(fetch_body "$PRODUCT_URL" "$PRODUCT_HTML")"
if [[ "$PRODUCT_CODE" == "200" ]]; then
  pass "GET ${PRODUCT_URL} → 200"
else
  fail "GET ${PRODUCT_URL} expected 200, got ${PRODUCT_CODE}"
fi

# Resolve Fund page chunk from the site bundle (brzrk-site code-split route).
FUND_CHUNK=""
if [[ -f "$FUND_HTML" ]]; then
  MAIN_JS="$(grep -oE '/assets/[^"[:space:]]+\.js' "$FUND_HTML" | head -1 || true)"
  if [[ -n "$MAIN_JS" ]]; then
    MAIN_BODY="$(mktemp "${TMPDIR:-/tmp}/playblast-main-js.XXXXXX")"
    MAIN_BASE="${FUND_URL%/fund}"
    fetch_body "${MAIN_BASE}${MAIN_JS}" "$MAIN_BODY" >/dev/null || true
    FUND_CHUNK="$(grep -oE 'assets/Fund-[^"[:space:]]+\.js' "$MAIN_BODY" | head -1 || true)"
    rm -f "$MAIN_BODY"
  fi
fi

if [[ -n "$FUND_CHUNK" ]]; then
  FUND_JS="$(mktemp "${TMPDIR:-/tmp}/playblast-fund-js.XXXXXX")"
  FUND_JS_BASE="${FUND_URL%/fund}"
  fetch_body "${FUND_JS_BASE}/${FUND_CHUNK}" "$FUND_JS" >/dev/null || true

  if grep -q "Not open" "$FUND_JS" && grep -q "Pre-launch" "$FUND_JS"; then
    pass "fund page bundle reports soft state (Pre-launch / Not open)"
  else
    fail "fund page bundle missing soft-state markers (Pre-launch / Not open)"
  fi

  if grep -qiE 'stripe|paypal|checkout\.stripe' "$FUND_JS"; then
    fail "fund page bundle contains payment-provider checkout markers"
  else
    pass "fund page bundle has no stripe/paypal checkout markers"
  fi

  rm -f "$FUND_JS"
else
  fail "could not resolve Fund page JS chunk from ${FUND_URL}"
fi

rm -f "$FUND_HTML" "$PRODUCT_HTML"

echo ""
echo "GitHub Sponsors enable (James gate)..."

SPONSORS_HEADERS="$(mktemp "${TMPDIR:-/tmp}/playblast-sponsors-headers.XXXXXX")"
SPONSORS_CODE="$(curl -sS -D "$SPONSORS_HEADERS" -o /dev/null -w "%{http_code}" "$SPONSORS_PROFILE_URL")" || {
  rm -f "$SPONSORS_HEADERS"
  fail "GET ${SPONSORS_PROFILE_URL} request failed"
  SPONSORS_CODE=""
}

if [[ -n "$SPONSORS_CODE" ]]; then
  LOCATION="$(grep -i '^location:' "$SPONSORS_HEADERS" | tail -1 | cut -d' ' -f2- | tr -d '\r' || true)"
  rm -f "$SPONSORS_HEADERS"

  if [[ "$SPONSORS_CODE" == "200" ]]; then
    pass "GitHub Sponsors profile live at ${SPONSORS_PROFILE_URL}"
  elif [[ "$SPONSORS_CODE" == "302" || "$SPONSORS_CODE" == "301" ]]; then
    if [[ "$LOCATION" == *"github.com/brzrk-motion"* && "$LOCATION" != *"/sponsors/"* ]]; then
      gate "GitHub Sponsors not enabled yet — ${SPONSORS_PROFILE_URL} redirects to org profile (${LOCATION})"
    else
      gate "GitHub Sponsors profile not confirmed — ${SPONSORS_PROFILE_URL} → ${SPONSORS_CODE} ${LOCATION:-"(no location)"}"
    fi
  else
    gate "GitHub Sponsors profile returned ${SPONSORS_CODE} — confirm enable status with James"
  fi
fi

echo ""
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "Sponsor program ready-check FAILED (${FAIL_COUNT} blocking, ${GATE_COUNT} gates)." >&2
  echo "Checklist: docs/sponsor-program-ready-check.md" >&2
  exit 1
fi

echo "Sponsor program ready-check verification passed (${GATE_COUNT} James gate item(s) noted)."
echo "Fund remains soft until James opens checkout (BRZ-230)."
echo "Checklist: docs/sponsor-program-ready-check.md"
exit 0
