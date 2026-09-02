import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import { closeDatabase, getDb, initDatabase } from "../storage/db.js"

export type BackupRestoreFixture = {
  markerId: string
  projectName: string
  uploadPath: string
  uploadContent: string
  avatarPath: string
  avatarContent: string
  studioId: string
  userEmail: string
  inviteEmail: string
  dbPath: string
}

export function seedBackupRestoreFixture(
  dataDir: string,
  uploadsDir: string,
  markerId: string,
): BackupRestoreFixture {
  const dbPath = path.join(dataDir, "playblast.db")
  const uploadRel = "projects/demo/versions/v1/marker.bin"
  const uploadPath = path.join(uploadsDir, uploadRel)
  const avatarRel = `avatars/studio-${markerId}/avatar.png`
  const avatarPath = path.join(uploadsDir, avatarRel)
  const projectName = `Backup Gate ${markerId}`
  const uploadContent = `playblast-upload-${markerId}`
  const avatarContent = `avatar-${markerId}`
  const studioId = `studio-${markerId}`
  const userId = `user-${markerId}`
  const inviteId = `invite-${markerId}`
  const sessionId = `session-${markerId}`
  const now = new Date().toISOString()

  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadsDir
  process.env.SESSION_SECRET = "backup-restore-fixture-secret-32chars"

  fs.mkdirSync(path.dirname(uploadPath), { recursive: true })
  fs.mkdirSync(path.dirname(avatarPath), { recursive: true })
  fs.writeFileSync(uploadPath, uploadContent, "utf8")
  fs.writeFileSync(avatarPath, avatarContent, "utf8")

  initDatabase(dbPath)
  const db = getDb()

  db.prepare(
    `INSERT INTO projects (id, name, createdAt, status, studioId)
     VALUES (?, ?, ?, 'active', ?)`,
  ).run(markerId, projectName, now, studioId)

  db.prepare(
    `INSERT INTO studios (id, name, avatar_path, setup_status, created_at, updated_at)
     VALUES (?, ?, ?, 'complete', ?, ?)`,
  ).run(studioId, "Backup Studio", avatarRel, now, now)

  db.prepare(
    `INSERT INTO users (
      id, studio_id, name, email, email_normalized, password_hash, role,
      disabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'admin', 0, ?, ?)`,
  ).run(
    userId,
    studioId,
    "Backup Admin",
    "admin@example.test",
    "admin@example.test",
    "hash-placeholder",
    now,
    now,
  )

  db.prepare(
    `INSERT INTO invitations (
      id, studio_id, email, email_normalized, name, role, token_hash, status,
      expires_at, invited_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'creative', ?, 'pending', ?, ?, ?, ?)`,
  ).run(
    inviteId,
    studioId,
    "creative@example.test",
    "creative@example.test",
    "Creative User",
    createHash("sha256").update(`invite-${markerId}`).digest("hex"),
    new Date(Date.now() + 86_400_000).toISOString(),
    userId,
    now,
    now,
  )

  db.prepare(
    `INSERT INTO sessions (
      id, user_id, studio_id, token_hash, expires_at, created_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    userId,
    studioId,
    createHash("sha256").update(`session-${markerId}`).digest("hex"),
    new Date(Date.now() + 86_400_000).toISOString(),
    now,
    now,
  )

  closeDatabase()

  return {
    markerId,
    projectName,
    uploadPath,
    uploadContent,
    avatarPath,
    avatarContent,
    studioId,
    userEmail: "admin@example.test",
    inviteEmail: "creative@example.test",
    dbPath,
  }
}

export function verifyBackupRestoreFixture(fixture: BackupRestoreFixture): void {
  assert.equal(fs.existsSync(fixture.uploadPath), true, "restored upload file is missing")
  assert.equal(
    fs.readFileSync(fixture.uploadPath, "utf8"),
    fixture.uploadContent,
    "restored upload content mismatch",
  )
  assert.equal(fs.existsSync(fixture.avatarPath), true, "restored avatar file is missing")
  assert.equal(
    fs.readFileSync(fixture.avatarPath, "utf8"),
    fixture.avatarContent,
    "restored avatar content mismatch",
  )

  const db = new Database(fixture.dbPath, { readonly: true })
  const integrity = db.pragma("integrity_check", { simple: true })
  assert.equal(integrity, "ok", `sqlite integrity_check failed: ${integrity}`)

  const project = db
    .prepare("SELECT id, name FROM projects WHERE id = ?")
    .get(fixture.markerId) as { id: string; name: string } | undefined
  assert.ok(project, "restored marker project row is missing")
  assert.equal(project.name, fixture.projectName)

  const studio = db
    .prepare("SELECT id, setup_status FROM studios WHERE id = ?")
    .get(fixture.studioId) as { id: string; setup_status: string } | undefined
  assert.ok(studio, "restored studio row is missing")
  assert.equal(studio.setup_status, "complete")

  const user = db
    .prepare("SELECT email FROM users WHERE studio_id = ?")
    .get(fixture.studioId) as { email: string } | undefined
  assert.ok(user, "restored user row is missing")
  assert.equal(user.email, fixture.userEmail)

  const invite = db
    .prepare("SELECT email, status FROM invitations WHERE studio_id = ?")
    .get(fixture.studioId) as { email: string; status: string } | undefined
  assert.ok(invite, "restored invitation row is missing")
  assert.equal(invite.email, fixture.inviteEmail)
  assert.equal(invite.status, "pending")

  const sessionCount = (
    db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE studio_id = ?").get(
      fixture.studioId,
    ) as { count: number }
  ).count
  assert.equal(sessionCount, 1, "restored session row is missing")

  db.close()
}

const mode = process.argv[2]
const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain && mode === "seed") {
  const dataDir = process.env.DATA_DIR
  const uploadsDir = process.env.UPLOADS_DIR
  const markerId = process.env.MARKER_ID
  if (!dataDir || !uploadsDir || !markerId) {
    console.error("DATA_DIR, UPLOADS_DIR, and MARKER_ID are required")
    process.exit(1)
  }
  seedBackupRestoreFixture(dataDir, uploadsDir, markerId)
} else if (isMain && mode === "verify") {
  const fixture: BackupRestoreFixture = {
    markerId: process.env.MARKER_ID ?? "",
    projectName: process.env.MARKER_PROJECT_NAME ?? "",
    uploadPath: process.env.UPLOAD_PATH ?? "",
    uploadContent: process.env.MARKER_UPLOAD_CONTENT ?? "",
    avatarPath: process.env.AVATAR_PATH ?? "",
    avatarContent: process.env.AVATAR_CONTENT ?? "",
    studioId: process.env.STUDIO_ID ?? "",
    userEmail: process.env.USER_EMAIL ?? "",
    inviteEmail: process.env.INVITE_EMAIL ?? "",
    dbPath: process.env.DB_PATH ?? "",
  }
  verifyBackupRestoreFixture(fixture)
} else if (isMain) {
  console.error("Usage: backup-restore-fixture.ts <seed|verify>")
  process.exit(1)
}
