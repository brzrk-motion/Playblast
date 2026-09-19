#!/usr/bin/env bash
# NAS deployment smoke: bind-mount layout (Synology-equivalent), health, persistence.
# Requires Docker. Never prints secret values.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "note: docker is unavailable; skipped NAS deployment verification."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "note: docker compose is unavailable; skipped NAS deployment verification."
  exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required when Docker is available" >&2
  exit 1
fi

COMPOSE_FILE="deploy/synology/docker-compose.synology.yml"
[[ -f "$COMPOSE_FILE" ]] || {
  echo "error: $COMPOSE_FILE is missing" >&2
  exit 1
}

SIM_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/playblast-nas-sim.XXXXXX")"
DATA_DIR="$SIM_ROOT/volume1/docker/playblast/data"
UPLOADS_DIR="$SIM_ROOT/volume1/docker/playblast/uploads"
ENV_FILE="$SIM_ROOT/.env"
HOST_PORT="${PLAYBLAST_NAS_SMOKE_PORT:-13000}"

mkdir -p "$DATA_DIR" "$UPLOADS_DIR"
cat >"$ENV_FILE" <<EOF
SESSION_SECRET=nas-deployment-check-secret-32chars
PLAYBLAST_DATA_DIR=$DATA_DIR
PLAYBLAST_UPLOADS_DIR=$UPLOADS_DIR
PLAYBLAST_HOST_PORT=$HOST_PORT
PROXY_HOPS=0
EOF

cleanup() {
  $COMPOSE --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p playblast-nas-smoke down -v >/dev/null 2>&1 || true
  rm -rf "$SIM_ROOT"
}
trap cleanup EXIT

BASE_URL="http://127.0.0.1:${HOST_PORT}"

echo "Validating NAS compose render..."
$COMPOSE --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "Starting Playblast with NAS bind mounts..."
# Container Manager loads .env from the project directory; the smoke uses --env-file explicitly.
$COMPOSE --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p playblast-nas-smoke up -d

echo "Waiting for /health..."
for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/health" 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  sleep 1
done

HEALTH_BODY="$(curl -fsS "${BASE_URL}/health")"
echo "$HEALTH_BODY" | grep -q '"status":"ok"' || {
  echo "error: /health did not report ok" >&2
  exit 1
}
echo "$HEALTH_BODY" | grep -q '"database":"ok"' || {
  echo "error: /health did not report database ok" >&2
  exit 1
}

SETUP_BODY="$(curl -fsS "${BASE_URL}/api/setup/status")"
echo "$SETUP_BODY" | grep -q '"status":"pending"' || {
  echo "error: fresh NAS bind-mount instance should report setup status pending" >&2
  exit 1
}

echo "Checking bind-mount persistence paths..."
[[ -f "$DATA_DIR/playblast.db" ]] || {
  echo "error: SQLite file was not created on the data bind mount" >&2
  exit 1
}

echo "NAS deployment verification passed."
