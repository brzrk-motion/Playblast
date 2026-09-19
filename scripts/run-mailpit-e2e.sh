#!/usr/bin/env bash
# Optional Mailpit E2E (BRZ-195): Playwright SMTP path asserted via Mailpit API.
# Does not replace file-capture invite flows in the main E2E suite.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

step() {
  echo "==> $*"
}

MAILPIT_CONTAINER="${PLAYBLAST_MAILPIT_CONTAINER:-playblast-mailpit-e2e}"
MAILPIT_API_PORT="${MAILPIT_API_PORT:-8025}"
MAILPIT_SMTP_PORT="${MAILPIT_SMTP_PORT:-1025}"
MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:${MAILPIT_API_PORT}}"
MAILPIT_BIN="${MAILPIT_BIN:-${ROOT_DIR}/.cache/mailpit/mailpit}"

started_mailpit=0
mailpit_pid=""

cleanup() {
  if [[ -n "$mailpit_pid" ]]; then
    kill "$mailpit_pid" >/dev/null 2>&1 || true
    wait "$mailpit_pid" 2>/dev/null || true
  fi
  if [[ "$started_mailpit" == "1" ]]; then
    docker rm -f "$MAILPIT_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

ensure_mailpit_binary() {
  if command -v mailpit >/dev/null 2>&1; then
    MAILPIT_BIN="$(command -v mailpit)"
    return 0
  fi
  if [[ -x "$MAILPIT_BIN" ]]; then
    return 0
  fi

  step "Download Mailpit binary"
  mkdir -p "$(dirname "$MAILPIT_BIN")"
  arch="$(uname -m)"
  case "$arch" in
    x86_64) mailpit_arch="amd64" ;;
    aarch64|arm64) mailpit_arch="arm64" ;;
    *) echo "error: unsupported architecture for Mailpit download: $arch" >&2; return 1 ;;
  esac
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/mailpit.tgz" \
    "https://github.com/axllent/mailpit/releases/latest/download/mailpit-linux-${mailpit_arch}.tar.gz"
  tar -xzf "${tmp}/mailpit.tgz" -C "${tmp}"
  mv "${tmp}/mailpit" "$MAILPIT_BIN"
  chmod +x "$MAILPIT_BIN"
  rm -rf "$tmp"
}

start_mailpit() {
  if curl -fsS "${MAILPIT_URL}/api/v1/info" >/dev/null 2>&1; then
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    step "Start Mailpit catcher (Docker)"
    docker rm -f "$MAILPIT_CONTAINER" >/dev/null 2>&1 || true
    docker run -d \
      --name "$MAILPIT_CONTAINER" \
      -p "${MAILPIT_API_PORT}:8025" \
      -p "${MAILPIT_SMTP_PORT}:1025" \
      axllent/mailpit >/dev/null
    started_mailpit=1
  else
    ensure_mailpit_binary
    step "Start Mailpit catcher (binary)"
    "$MAILPIT_BIN" \
      --listen "127.0.0.1:${MAILPIT_API_PORT}" \
      --smtp "127.0.0.1:${MAILPIT_SMTP_PORT}" \
      >/tmp/playblast-mailpit.log 2>&1 &
    mailpit_pid=$!
  fi

  for _ in $(seq 1 30); do
    if curl -fsS "${MAILPIT_URL}/api/v1/info" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done

  echo "error: Mailpit did not become healthy at ${MAILPIT_URL}" >&2
  return 1
}

start_mailpit

step "Build production artifacts"
npm run build

step "Type-check Playwright suite"
npx tsc -p e2e/tsconfig.json

step "Install Playwright Chromium"
npx playwright install chromium

step "Run Mailpit Playwright E2E"
export MAILPIT_URL
export MAILPIT_SMTP_PORT
npx playwright test --config e2e/playwright.config.ts --project=mailpit

echo "Mailpit E2E passed."
