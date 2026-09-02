#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MARKER_FILE="persistence-check.txt"
MARKER_CONTENT="playblast-volume-persistence-$(date +%s)"

if ! command -v docker >/dev/null 2>&1; then
  echo "note: docker is unavailable; skipped upload volume persistence check."
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "note: docker daemon is unavailable; skipped upload volume persistence check."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "note: docker compose is unavailable; skipped upload volume persistence check."
  exit 0
fi

export SESSION_SECRET="upload-volume-check-secret-32-characters"

cleanup() {
  $COMPOSE down -v >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Building and starting Playblast..."
$COMPOSE up -d --build

echo "Waiting for /health..."
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:3000/health" 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://localhost:3000/health" 2>/dev/null | grep -q '"status":"ok"'; then
  echo "error: server did not become ready in time" >&2
  exit 1
fi

echo "Writing persistence marker into the uploads volume..."
$COMPOSE exec -T playblast sh -c "printf '%s' '$MARKER_CONTENT' > /app/uploads/$MARKER_FILE"

echo "Stopping containers (volume should remain)..."
$COMPOSE down

echo "Starting containers again..."
$COMPOSE up -d

echo "Waiting for /health after restart..."
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:3000/health" 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  sleep 1
done

echo "Checking persistence marker..."
PERSISTED_CONTENT="$($COMPOSE exec -T playblast cat "/app/uploads/$MARKER_FILE")"

if [ "$PERSISTED_CONTENT" != "$MARKER_CONTENT" ]; then
  echo "error: upload volume persistence check failed" >&2
  echo "expected: $MARKER_CONTENT" >&2
  echo "actual:   $PERSISTED_CONTENT" >&2
  exit 1
fi

echo "Upload volume persistence validated successfully."
