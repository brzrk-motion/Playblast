#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MARKER_FILE="persistence-check.txt"
MARKER_CONTENT="playblast-volume-persistence-$(date +%s)"
COMPOSE="docker compose"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required to validate upload volume persistence" >&2
  exit 1
fi

cleanup() {
  $COMPOSE down >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Building and starting Playblast..."
$COMPOSE up -d --build

echo "Waiting for server to become ready..."
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:3000/api/projects" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://localhost:3000/api/projects" >/dev/null 2>&1; then
  echo "error: server did not become ready in time" >&2
  exit 1
fi

echo "Writing persistence marker into the uploads volume..."
$COMPOSE exec -T playblast sh -c "printf '%s' '$MARKER_CONTENT' > /app/server/uploads/$MARKER_FILE"

echo "Stopping containers (volume should remain)..."
$COMPOSE down

echo "Starting containers again..."
$COMPOSE up -d

echo "Waiting for server after restart..."
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:3000/api/projects" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Checking persistence marker..."
PERSISTED_CONTENT="$($COMPOSE exec -T playblast cat "/app/server/uploads/$MARKER_FILE")"

if [ "$PERSISTED_CONTENT" != "$MARKER_CONTENT" ]; then
  echo "error: upload volume persistence check failed" >&2
  echo "expected: $MARKER_CONTENT" >&2
  echo "actual:   $PERSISTED_CONTENT" >&2
  exit 1
fi

echo "Upload volume persistence validated successfully."
