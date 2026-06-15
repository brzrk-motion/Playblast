#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

IMAGE_NAME="${IMAGE_NAME:-brzrk/playblast:latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
DEPLOY_DIR="$ROOT_DIR/deploy"
OUTPUT_FILE="$DEPLOY_DIR/playblast.tar.gz"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required to build the deployment image" >&2
  exit 1
fi

mkdir -p "$DEPLOY_DIR"

echo "Building $IMAGE_NAME for $PLATFORM..."
docker build --platform "$PLATFORM" -t "$IMAGE_NAME" .

echo "Saving image to $OUTPUT_FILE..."
docker save "$IMAGE_NAME" | gzip > "$OUTPUT_FILE"

echo "Done. Load it on the NAS with:"
echo "  sudo docker load < $(basename "$OUTPUT_FILE")"
