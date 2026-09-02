#!/usr/bin/env bash
# Verifies that the self-hosted data layout (SQLite under data/ + files under uploads/)
# survives backup → wipe → restore, including identity tables, avatars, invites, and sessions.
#
# Does not require Docker. Does not read or print auth credentials.
# Full container/NAS Hyper Backup end-to-end is out of scope for this script.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MARKER_ID="backup-restore-marker-$(date +%s)"
MARKER_UPLOAD_CONTENT="playblast-upload-${MARKER_ID}"
MARKER_PROJECT_NAME="Backup Gate ${MARKER_ID}"
AVATAR_CONTENT="avatar-${MARKER_ID}"

if ! command -v tar >/dev/null 2>&1; then
  echo "error: tar is required to validate backup/restore" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required to seed and verify the SQLite database" >&2
  exit 1
fi

if [[ ! -d "$ROOT_DIR/node_modules/better-sqlite3" ]]; then
  echo "error: better-sqlite3 is missing; run npm install from the repo root first" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/playblast-backup-restore.XXXXXX")"
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

LIVE_DIR="$WORK_DIR/live"
DATA_DIR="$LIVE_DIR/data"
UPLOADS_DIR="$LIVE_DIR/uploads"
BACKUP_DIR="$WORK_DIR/backup"
ARCHIVE="$BACKUP_DIR/playblast-data-uploads.tar.gz"
DB_PATH="$DATA_DIR/playblast.db"
UPLOAD_REL="projects/demo/versions/v1/marker.bin"
UPLOAD_PATH="$UPLOADS_DIR/$UPLOAD_REL"
AVATAR_REL="avatars/studio-${MARKER_ID}/avatar.png"
AVATAR_PATH="$UPLOADS_DIR/$AVATAR_REL"
STUDIO_ID="studio-${MARKER_ID}"

mkdir -p "$DATA_DIR" "$UPLOADS_DIR/$(dirname "$UPLOAD_REL")" "$BACKUP_DIR"

echo "Seeding fixture database, identity rows, media, and avatar..."
DATA_DIR="$DATA_DIR" \
UPLOADS_DIR="$UPLOADS_DIR" \
MARKER_ID="$MARKER_ID" \
npx tsx server/src/scripts/backup-restore-fixture.ts seed

echo "Creating backup archive of data/ and uploads/..."
tar -C "$LIVE_DIR" -czf "$ARCHIVE" data uploads

echo "Wiping live data and uploads..."
rm -rf "$DATA_DIR" "$UPLOADS_DIR"
if [[ -e "$DB_PATH" || -e "$UPLOAD_PATH" ]]; then
  echo "error: live paths were not fully removed before restore" >&2
  exit 1
fi

echo "Restoring from backup archive..."
mkdir -p "$LIVE_DIR"
tar -C "$LIVE_DIR" -xzf "$ARCHIVE"

echo "Verifying restored SQLite integrity, identity rows, media, and avatar..."
MARKER_ID="$MARKER_ID" \
MARKER_PROJECT_NAME="$MARKER_PROJECT_NAME" \
DB_PATH="$DB_PATH" \
UPLOAD_PATH="$UPLOAD_PATH" \
MARKER_UPLOAD_CONTENT="$MARKER_UPLOAD_CONTENT" \
AVATAR_PATH="$AVATAR_PATH" \
AVATAR_CONTENT="$AVATAR_CONTENT" \
STUDIO_ID="$STUDIO_ID" \
USER_EMAIL="admin@example.test" \
INVITE_EMAIL="creative@example.test" \
npx tsx server/src/scripts/backup-restore-fixture.ts verify

if command -v docker >/dev/null 2>&1; then
  echo "note: docker is available, but this gate validates filesystem backup/restore only (not container volumes)."
else
  echo "note: docker is unavailable; skipped container-volume backup checks (filesystem gate only)."
fi

echo "Backup/restore verification passed."
