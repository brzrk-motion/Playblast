#!/usr/bin/env bash
# Verifies that the pilot data layout (SQLite under data/ + files under uploads/)
# survives backup → wipe → restore. This is a filesystem-level gate that mirrors
# the NAS bind-mount folders Hyper Backup should cover.
#
# Does not require Docker. Does not read or print auth credentials.
# Full container/NAS Hyper Backup end-to-end is out of scope for this script.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MARKER_ID="backup-restore-marker-$(date +%s)"
MARKER_UPLOAD_CONTENT="playblast-upload-${MARKER_ID}"
MARKER_PROJECT_NAME="Pilot Backup Gate ${MARKER_ID}"

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

mkdir -p "$DATA_DIR" "$UPLOADS_DIR/$(dirname "$UPLOAD_REL")" "$BACKUP_DIR"

echo "Seeding fixture SQLite DB and upload file..."
MARKER_ID="$MARKER_ID" \
MARKER_PROJECT_NAME="$MARKER_PROJECT_NAME" \
DB_PATH="$DB_PATH" \
UPLOAD_PATH="$UPLOAD_PATH" \
MARKER_UPLOAD_CONTENT="$MARKER_UPLOAD_CONTENT" \
node --input-type=module <<'EOF'
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(path.join(process.cwd(), "package.json"))
const Database = require("better-sqlite3")

const dbPath = process.env.DB_PATH
const uploadPath = process.env.UPLOAD_PATH
const markerId = process.env.MARKER_ID
const projectName = process.env.MARKER_PROJECT_NAME
const uploadContent = process.env.MARKER_UPLOAD_CONTENT

fs.mkdirSync(path.dirname(dbPath), { recursive: true })
fs.mkdirSync(path.dirname(uploadPath), { recursive: true })

const db = new Database(dbPath)
db.exec(`
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
`)
db.prepare("INSERT INTO projects (id, name) VALUES (?, ?)").run(markerId, projectName)
db.close()

fs.writeFileSync(uploadPath, uploadContent, "utf8")
EOF

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

echo "Verifying restored SQLite integrity and upload content..."
MARKER_ID="$MARKER_ID" \
MARKER_PROJECT_NAME="$MARKER_PROJECT_NAME" \
DB_PATH="$DB_PATH" \
UPLOAD_PATH="$UPLOAD_PATH" \
MARKER_UPLOAD_CONTENT="$MARKER_UPLOAD_CONTENT" \
node --input-type=module <<'EOF'
import fs from "node:fs"
import path from "node:path"
import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(path.join(process.cwd(), "package.json"))
const Database = require("better-sqlite3")

const dbPath = process.env.DB_PATH
const uploadPath = process.env.UPLOAD_PATH
const markerId = process.env.MARKER_ID
const projectName = process.env.MARKER_PROJECT_NAME
const uploadContent = process.env.MARKER_UPLOAD_CONTENT

assert.equal(fs.existsSync(dbPath), true, "restored database is missing")
assert.equal(fs.existsSync(uploadPath), true, "restored upload file is missing")
assert.equal(
  fs.readFileSync(uploadPath, "utf8"),
  uploadContent,
  "restored upload content mismatch",
)

const db = new Database(dbPath, { readonly: true })
const integrity = db.pragma("integrity_check", { simple: true })
assert.equal(integrity, "ok", `sqlite integrity_check failed: ${integrity}`)

const row = db
  .prepare("SELECT id, name FROM projects WHERE id = ?")
  .get(markerId)
assert.ok(row, "restored marker project row is missing")
assert.equal(row.name, projectName, "restored project name mismatch")
db.close()
EOF

if command -v docker >/dev/null 2>&1; then
  echo "note: docker is available, but this gate validates filesystem backup/restore only (not container volumes)."
else
  echo "note: docker is unavailable; skipped container-volume backup checks (filesystem gate only)."
fi

echo "Backup/restore verification passed."
