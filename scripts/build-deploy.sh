#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Canonical local tag matches docker-compose.yml / Synology sample (playblast:latest).
# Override for a registry path, e.g. IMAGE_NAME=ghcr.io/brzrk-motion/playblast:0.1.0-rc.1
IMAGE_NAME="${IMAGE_NAME:-playblast:latest}"
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
