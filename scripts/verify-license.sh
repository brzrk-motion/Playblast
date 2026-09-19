#!/usr/bin/env bash
# Verify root MIT LICENSE for OSC / GitHub license detection readiness.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LICENSE_FILE="$ROOT_DIR/LICENSE"
EXPECTED_HOLDER="brzrk-motion"

fail() {
  echo "error: $*" >&2
  exit 1
}

pass() {
  echo "  ✓ $*"
}

echo "Verifying MIT LICENSE at repository root..."

[[ -f "$LICENSE_FILE" ]] || fail "LICENSE file is missing at repository root"
[[ -r "$LICENSE_FILE" ]] || fail "LICENSE file is not readable"

license_text="$(cat "$LICENSE_FILE")"

[[ "$license_text" == *"MIT License"* ]] || fail "LICENSE is missing the MIT License heading"
[[ "$license_text" == *"Copyright (c)"* ]] || fail "LICENSE is missing a copyright notice"
[[ "$license_text" == *"$EXPECTED_HOLDER"* ]] || fail "LICENSE copyright holder must be $EXPECTED_HOLDER"
[[ "$license_text" == *"Permission is hereby granted, free of charge"* ]] || fail "LICENSE is missing standard MIT grant language"
[[ "$license_text" == *"THE SOFTWARE IS PROVIDED \"AS IS\""* ]] || fail "LICENSE is missing standard MIT disclaimer"
[[ "$license_text" == *"OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE"* ]] || fail "LICENSE is missing standard MIT closing clause"
[[ "$license_text" == *"SOFTWARE."* ]] || fail "LICENSE is missing standard MIT closing clause"

pass "LICENSE exists, is readable, and contains standard MIT text for $EXPECTED_HOLDER"

grep -q '\[MIT\](LICENSE)' README.md || fail "README.md must link to LICENSE"
pass "README.md links to LICENSE"

grep -q 'MIT' CONTRIBUTING.md || fail "CONTRIBUTING.md must reference the MIT license"
grep -q 'LICENSE' CONTRIBUTING.md || fail "CONTRIBUTING.md must link to LICENSE"
pass "CONTRIBUTING.md references MIT and links to LICENSE"

if grep -q '"license"' package.json; then
  grep -q '"license": "MIT"' package.json || fail 'package.json license field must be "MIT"'
  pass 'package.json declares "license": "MIT"'
else
  fail 'package.json is missing a "license": "MIT" field'
fi

echo "MIT license verification passed."
