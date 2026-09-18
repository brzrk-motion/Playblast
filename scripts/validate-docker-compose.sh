#!/usr/bin/env bash
# Validates docker-compose.yml syntax and required environment interpolation.
# Requires Docker Compose v2. Does not start containers or read .env secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "note: docker is unavailable; skipped docker compose config validation."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "note: docker compose is unavailable; skipped docker compose config validation."
  exit 0
fi

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-compose-check.XXXXXX")"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

# Compose config interpolation requires SESSION_SECRET to be set.
export SESSION_SECRET="compose-config-check-secret-32-characters-min"

echo "Validating docker-compose.yml..."
$COMPOSE -f docker-compose.yml config >/dev/null

if [[ -f docker-compose.dev.yml ]]; then
  echo "Validating docker-compose.dev.yml overlay..."
  $COMPOSE -f docker-compose.yml -f docker-compose.dev.yml config >/dev/null
  $COMPOSE -f docker-compose.yml -f docker-compose.dev.yml config | grep -q 'axllent/mailpit' || {
    echo "error: rendered dev compose config missing Mailpit service" >&2
    exit 1
  }
fi

echo "Checking healthcheck and required environment..."
$COMPOSE -f docker-compose.yml config | grep -q 'SESSION_SECRET' || {
  echo "error: rendered compose config missing SESSION_SECRET" >&2
  exit 1
}

echo "Docker Compose configuration validation passed."
