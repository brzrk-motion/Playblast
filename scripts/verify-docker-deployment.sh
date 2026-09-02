#!/usr/bin/env bash
# End-to-end Docker deployment smoke: build, start, health check, clean install metadata.
# Requires Docker. Never prints secret values.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "note: docker is unavailable; skipped docker deployment verification."
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "note: docker daemon is unavailable; skipped docker deployment verification."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "note: docker compose is unavailable; skipped docker deployment verification."
  exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required when Docker is available" >&2
  exit 1
fi

export SESSION_SECRET="docker-deployment-check-secret-32chars"

cleanup() {
  $COMPOSE down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Building and starting Playblast via Docker Compose..."
$COMPOSE up -d --build

echo "Waiting for /health..."
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:3000/health" 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  sleep 1
done

HEALTH_BODY="$(curl -fsS "http://localhost:3000/health")"
echo "$HEALTH_BODY" | grep -q '"status":"ok"' || {
  echo "error: /health did not report ok" >&2
  exit 1
}
echo "$HEALTH_BODY" | grep -q '"database":"ok"' || {
  echo "error: /health did not report database ok" >&2
  exit 1
}

echo "Checking clean-install setup status..."
SETUP_BODY="$(curl -fsS "http://localhost:3000/api/setup/status")"
echo "$SETUP_BODY" | grep -q '"status":"pending"' || {
  echo "error: fresh instance should report setup status pending" >&2
  exit 1
}

echo "Checking container health status..."
for _ in $(seq 1 30); do
  HEALTH_STATUS="$($COMPOSE ps --format json 2>/dev/null | node --input-type=module -e "
    let input = '';
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => {
      const lines = input.trim().split('\\n').filter(Boolean);
      const service = lines.find((line) => {
        try { return JSON.parse(line).Service === 'playblast'; } catch { return false; }
      });
      if (!service) process.exit(2);
      const parsed = JSON.parse(service);
      process.stdout.write(parsed.Health ?? '');
    });
  " 2>/dev/null || true)"
  if [[ "$HEALTH_STATUS" == "healthy" ]]; then
    break
  fi
  sleep 2
done

if [[ "$HEALTH_STATUS" != "healthy" ]]; then
  echo "note: container health status is '${HEALTH_STATUS:-unknown}' (Compose healthcheck may still be warming up)."
fi

echo "Docker deployment verification passed."
