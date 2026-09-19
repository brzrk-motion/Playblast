#!/usr/bin/env bash
# Fund/sponsor CTA gate (BRZ-230). Default: confirm CTAs stay closed (soft fund).
# Live mode (PLAYBLAST_FUND_CTA_MODE=live): confirm checkout is open before CTAs ship.
#
# Manual checklist: docs/fund-sponsor-cta-gate.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FUND_URL="${PLAYBLAST_FUND_URL:-https://brzrkmotion.com/fund}"
PRODUCT_URL="${PLAYBLAST_PRODUCT_URL:-https://brzrkmotion.com/playblast}"
SPONSORS_PROFILE_URL="${PLAYBLAST_SPONSORS_URL:-https://github.com/sponsors/brzrk-motion}"
CTA_MODE="${PLAYBLAST_FUND_CTA_MODE:-soft}"

GATE_DOC="docs/fund-sponsor-cta-gate.md"
CTA_LINEAR_DOC_MARKER="Fund/sponsor CTA copy (BRZ-230)"

FAIL_COUNT=0

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

fail() {
  echo "error: $*" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

pass() {
  echo "  ✓ $*"
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

resolve_fund_js() {
  local fund_html="$1"
  local fund_js_out="$2"
  local main_js main_body fund_chunk fund_base

  main_js="$(grep -oE '/assets/[^"[:space:]]+\.js' "$fund_html" | head -1 || true)"
  [[ -n "$main_js" ]] || return 1

  main_body="$(mktemp "${TMPDIR:-/tmp}/playblast-main-js.XXXXXX")"
  fund_base="${FUND_URL%/fund}"
  fetch_body "${fund_base}${main_js}" "$main_body" >/dev/null || {
    rm -f "$main_body"
    return 1
  }

  fund_chunk="$(grep -oE 'assets/Fund-[^"[:space:]]+\.js' "$main_body" | head -1 || true)"
  rm -f "$main_body"
  [[ -n "$fund_chunk" ]] || return 1

  fetch_body "${fund_base}/${fund_chunk}" "$fund_js_out" >/dev/null
}

echo "Fund/sponsor CTA gate (BRZ-230)"
echo "  Mode:       ${CTA_MODE}"
echo "  Fund URL:   ${FUND_URL}"
echo ""

echo "Repo gate docs..."
[[ -f "$GATE_DOC" ]] || fail "missing ${GATE_DOC}"
pass "${GATE_DOC} present"
grep -q "BRZ-230" "$GATE_DOC" || fail "${GATE_DOC} missing BRZ-230 reference"
pass "${GATE_DOC} references BRZ-230"
grep -q "James" "$GATE_DOC" || fail "${GATE_DOC} missing James gate"
pass "${GATE_DOC} documents James enable gate"
grep -q "$CTA_LINEAR_DOC_MARKER" "$GATE_DOC" || fail "${GATE_DOC} missing CTA copy doc link"
pass "${GATE_DOC} links CTA copy Linear doc"

echo ""
echo "Public fund surface..."

FUND_HTML="$(mktemp "${TMPDIR:-/tmp}/playblast-fund-cta.XXXXXX")"
FUND_CODE="$(fetch_body "$FUND_URL" "$FUND_HTML")"
if [[ "$FUND_CODE" == "200" ]]; then
  pass "GET ${FUND_URL} → 200"
else
  fail "GET ${FUND_URL} expected 200, got ${FUND_CODE}"
fi

FUND_JS="$(mktemp "${TMPDIR:-/tmp}/playblast-fund-cta-js.XXXXXX")"
if resolve_fund_js "$FUND_HTML" "$FUND_JS"; then
  if [[ "$CTA_MODE" == "live" ]]; then
    if grep -q "Not open" "$FUND_JS" || grep -q "Pre-launch" "$FUND_JS"; then
      fail "live mode: fund page still reports soft state (Pre-launch / Not open)"
    else
      pass "live mode: fund page no longer reports soft-only markers"
    fi
  else
    if grep -q "Not open" "$FUND_JS" && grep -q "Pre-launch" "$FUND_JS"; then
      pass "soft mode: fund page reports checkout not open (CTA gate held)"
    else
      fail "soft mode: fund page missing soft-state markers — CTAs may be open prematurely"
    fi
  fi

  if grep -qiE 'stripe|paypal|checkout\.stripe' "$FUND_JS"; then
    if [[ "$CTA_MODE" == "live" ]]; then
      pass "live mode: payment checkout markers present on fund bundle"
    else
      fail "soft mode: fund bundle contains payment checkout markers"
    fi
  elif [[ "$CTA_MODE" == "live" ]]; then
    fail "live mode: fund bundle missing expected checkout markers"
  else
    pass "soft mode: no stripe/paypal checkout markers on fund bundle"
  fi
else
  fail "could not resolve Fund page JS chunk from ${FUND_URL}"
fi

rm -f "$FUND_HTML" "$FUND_JS"

echo ""
echo "GitHub Sponsors profile..."

SPONSORS_HEADERS="$(mktemp "${TMPDIR:-/tmp}/playblast-cta-sponsors-headers.XXXXXX")"
SPONSORS_CODE="$(curl -sS -D "$SPONSORS_HEADERS" -o /dev/null -w "%{http_code}" "$SPONSORS_PROFILE_URL")" || {
  rm -f "$SPONSORS_HEADERS"
  fail "GET ${SPONSORS_PROFILE_URL} request failed"
  SPONSORS_CODE=""
}

if [[ -n "$SPONSORS_CODE" ]]; then
  LOCATION="$(grep -i '^location:' "$SPONSORS_HEADERS" | tail -1 | cut -d' ' -f2- | tr -d '\r' || true)"
  rm -f "$SPONSORS_HEADERS"

  if [[ "$SPONSORS_CODE" == "200" ]]; then
    if [[ "$CTA_MODE" == "live" ]]; then
      pass "live mode: GitHub Sponsors profile live"
    else
      pass "GitHub Sponsors profile live (checkout open possible — confirm James gate before CTAs)"
    fi
  elif [[ "$SPONSORS_CODE" == "302" || "$SPONSORS_CODE" == "301" ]]; then
    if [[ "$LOCATION" == *"github.com/brzrk-motion"* && "$LOCATION" != *"/sponsors/"* ]]; then
      if [[ "$CTA_MODE" == "live" ]]; then
        fail "live mode: GitHub Sponsors not enabled — ${SPONSORS_PROFILE_URL} redirects to org"
      else
        pass "soft mode: GitHub Sponsors not enabled yet (CTA gate correctly blocked)"
      fi
    elif [[ "$CTA_MODE" == "live" ]]; then
      fail "live mode: Sponsors profile not confirmed (${SPONSORS_CODE} ${LOCATION:-})"
    else
      pass "soft mode: Sponsors profile not live (expected before James gate)"
    fi
  elif [[ "$CTA_MODE" == "live" ]]; then
    fail "live mode: Sponsors profile returned ${SPONSORS_CODE}"
  else
    pass "soft mode: Sponsors profile status ${SPONSORS_CODE} (gate held)"
  fi
fi

echo ""
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "Fund/sponsor CTA gate verification FAILED (${FAIL_COUNT} blocking)." >&2
  echo "Checklist: ${GATE_DOC}" >&2
  exit 1
fi

if [[ "$CTA_MODE" == "live" ]]; then
  echo "Fund/sponsor CTA gate live verification passed."
  echo "Confirm James-approved copy is queued/published per ${GATE_DOC}."
else
  echo "Fund/sponsor CTA gate held (soft)."
  echo "Do not publish fund/sponsor CTAs until James opens checkout (BRZ-230)."
fi
echo "Checklist: ${GATE_DOC}"
exit 0
