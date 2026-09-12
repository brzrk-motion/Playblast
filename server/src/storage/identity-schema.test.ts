import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import Database from "better-sqlite3"
import {
  closeDatabase,
  initDatabase,
  __testOnly_tableHasColumn,
} from "../storage/db.js"
import { __testOnly_migrateIdentityOn } from "../db/migrate-identity.js"
import {
  getSetupStatusResponse,
  getStudioCount,
  __testOnly_getStudioById,
} from "../identity/repository.js"
import { getDrizzle, resetDrizzle } from "../db/drizzle.js"

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}

describe("identity schema and Drizzle migrations", () => {
  let tempDir = ""
  let dbPath = ""

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `playblast-identity-${randomSuffix()}-`))
    dbPath = path.join(tempDir, "fresh.db")
    process.env.DB_PATH = dbPath
    initDatabase(dbPath)
  })

  after(() => {
    delete process.env.DB_PATH
    closeDatabase()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("creates identity tables via Drizzle migrations", () => {
    const db = new Database(dbPath, { readonly: true })

    for (const table of [
      "studios",
      "users",
      "sessions",
      "invitations",
      "studio_smtp_settings",
      "audit_events",
      "__drizzle_migrations",
    ]) {
      const row = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(table) as { name: string } | undefined
      assert.equal(row?.name, table, `expected table ${table}`)
    }

    db.close()
  })

  it("records Drizzle migration metadata separately from legacy schema_migrations", () => {
    const db = new Database(dbPath, { readonly: true })

    const legacyMigrations = db
      .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
      .get() as { count: number }
    const drizzleMigrations = db
      .prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations")
      .get() as { count: number }

    assert.ok(legacyMigrations.count >= 0)
    assert.ok(drizzleMigrations.count >= 1)

    db.close()
  })

  it("returns pending setup status on a fresh database", () => {
    const status = getSetupStatusResponse()
    assert.equal(status.status, "pending")
    assert.equal(status.nextRoute, "/setup")
    assert.equal(status.setupComplete, false)
    assert.equal(getStudioCount(), 0)
  })

  it("enforces WAL mode and foreign keys", () => {
    const db = new Database(dbPath, { readonly: true })
    const journalMode = db.pragma("journal_mode", { simple: true }) as string
    const foreignKeys = db.pragma("foreign_keys", { simple: true }) as number

    assert.equal(journalMode.toLowerCase(), "wal")
    assert.equal(foreignKeys, 1)
    db.close()
  })

  it("preserves identity columns and indexes", () => {
    const db = new Database(dbPath, { readonly: true })

    assert.ok(__testOnly_tableHasColumn(db, "users", "email_normalized"))
    assert.ok(__testOnly_tableHasColumn(db, "users", "password_hash"))
    assert.ok(__testOnly_tableHasColumn(db, "invitations", "token_hash"))
    assert.ok(__testOnly_tableHasColumn(db, "studio_smtp_settings", "password_encrypted"))
    assert.ok(__testOnly_tableHasColumn(db, "sessions", "token_hash"))

    const userEmailIndex = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'users_email_normalized_unique'",
      )
      .get() as { name: string } | undefined
    assert.equal(userEmailIndex?.name, "users_email_normalized_unique")

    db.close()
  })

  it("accepts Account Executive users and invitations", () => {
    const db = new Database(dbPath)
    db.exec(`
      INSERT INTO studios (id, name, setup_status, created_at, updated_at)
      VALUES ('ae-studio', 'AE Studio', 'complete', '2026-01-01', '2026-01-01');
      INSERT INTO users (
        id, studio_id, name, email, email_normalized, password_hash, role,
        disabled, created_at, updated_at
      ) VALUES (
        'ae-user', 'ae-studio', 'AE User', 'ae@example.test', 'ae@example.test',
        'hash', 'account_executive', 0, '2026-01-01', '2026-01-01'
      );
      INSERT INTO invitations (
        id, studio_id, email, email_normalized, name, role, token_hash,
        status, expires_at, created_at, updated_at
      ) VALUES (
        'ae-invite', 'ae-studio', 'new-ae@example.test', 'new-ae@example.test',
        'New AE', 'account_executive', 'token', 'pending', '2099-01-01',
        '2026-01-01', '2026-01-01'
      );
    `)
    assert.equal(
      (db.prepare("SELECT role FROM users WHERE id = 'ae-user'").get() as { role: string }).role,
      "account_executive",
    )
    assert.equal(
      (db.prepare("SELECT role FROM invitations WHERE id = 'ae-invite'").get() as { role: string }).role,
      "account_executive",
    )
    db.close()
  })
})

describe("identity migration on existing proofing database", () => {
  let tempDir = ""
  let dbPath = ""

  before(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `playblast-identity-upgrade-${randomSuffix()}-`),
    )
    dbPath = path.join(tempDir, "legacy.db")

    const db = new Database(dbPath)
    db.pragma("journal_mode = WAL")
    db.pragma("foreign_keys = ON")
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      );
      INSERT INTO projects (id, name, createdAt, status)
      VALUES ('project-1', 'Legacy Project', '2026-01-01T00:00:00.000Z', 'active');
    `)
    db.close()

    process.env.DB_PATH = dbPath
    initDatabase(dbPath)
  })

  after(() => {
    delete process.env.DB_PATH
    closeDatabase()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("backfills a pending studio when proofing data already exists", () => {
    const studio = __testOnly_getStudioById("legacy-studio")
    assert.ok(studio)
    assert.equal(studio.setupStatus, "pending")

    const status = getSetupStatusResponse()
    assert.equal(status.status, "pending")
    assert.equal(status.nextRoute, "/setup")
    assert.equal(status.setupComplete, false)
  })

  it("keeps legacy project rows intact after identity migration", () => {
    const db = new Database(dbPath, { readonly: true })
    const project = db
      .prepare("SELECT id, name FROM projects WHERE id = ?")
      .get("project-1") as { id: string; name: string } | undefined

    assert.deepEqual(project, { id: "project-1", name: "Legacy Project" })
    db.close()
  })

  it("preserves identity rows when upgrading the pre-Account Executive schema", () => {
    const db = new Database(":memory:")
    db.pragma("foreign_keys = ON")
    db.exec(`
      CREATE TABLE studios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        avatar_path TEXT,
        setup_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        studio_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        email_normalized TEXT NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'creative', 'proofing')),
        disabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      );
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        studio_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
      );
      CREATE TABLE invitations (
        id TEXT PRIMARY KEY,
        studio_id TEXT NOT NULL,
        email TEXT NOT NULL,
        email_normalized TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('creative', 'proofing')),
        token_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TEXT NOT NULL,
        invited_by_user_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE TABLE audit_events (
        id TEXT PRIMARY KEY,
        studio_id TEXT,
        user_id TEXT,
        event_type TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE TABLE __drizzle_migrations (
        id INTEGER PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at NUMERIC
      );
      INSERT INTO __drizzle_migrations (id, hash, created_at)
      VALUES (1, '0001', 1788280000000);
      INSERT INTO studios (id, name, setup_status, created_at, updated_at)
      VALUES ('upgrade-studio', 'Upgrade Studio', 'complete', '2026-01-01', '2026-01-01');
      INSERT INTO users (
        id, studio_id, name, email, email_normalized, password_hash, role,
        created_at, updated_at
      ) VALUES (
        'upgrade-user', 'upgrade-studio', 'Existing Admin', 'admin@example.test',
        'admin@example.test', 'hash', 'admin', '2026-01-01', '2026-01-01'
      );
      INSERT INTO sessions (
        id, user_id, studio_id, token_hash, expires_at, created_at, last_seen_at
      ) VALUES (
        'upgrade-session', 'upgrade-user', 'upgrade-studio', 'session-hash',
        '2099-01-01', '2026-01-01', '2026-01-01'
      );
      INSERT INTO invitations (
        id, studio_id, email, email_normalized, name, role, token_hash,
        expires_at, created_at, updated_at
      ) VALUES (
        'upgrade-invite', 'upgrade-studio', 'creative@example.test',
        'creative@example.test', 'Existing Creative', 'creative', 'invite-hash',
        '2099-01-01', '2026-01-01', '2026-01-01'
      );
      INSERT INTO audit_events (id, studio_id, user_id, event_type, created_at)
      VALUES ('upgrade-audit', 'upgrade-studio', 'upgrade-user', 'login', '2026-01-01');
    `)

    __testOnly_migrateIdentityOn(db)

    assert.equal(
      (db.prepare("SELECT role FROM users WHERE id = 'upgrade-user'").get() as { role: string }).role,
      "admin",
    )
    assert.equal(
      (db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE id = 'upgrade-session'").get() as { count: number }).count,
      1,
    )
    assert.equal(
      (db.prepare("SELECT COUNT(*) AS count FROM invitations WHERE id = 'upgrade-invite'").get() as { count: number }).count,
      1,
    )
    assert.equal(
      (db.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE id = 'upgrade-audit'").get() as { count: number }).count,
      1,
    )
    assert.equal(db.pragma("foreign_keys", { simple: true }), 1)
    assert.deepEqual(db.pragma("foreign_key_check"), [])
    db.close()
  })
})

describe("identity migration idempotency", () => {
  let tempDir = ""
  let dbPath = ""

  before(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `playblast-identity-repeat-${randomSuffix()}-`),
    )
    dbPath = path.join(tempDir, "repeat.db")
    process.env.DB_PATH = dbPath
    initDatabase(dbPath)
  })

  after(() => {
    delete process.env.DB_PATH
    closeDatabase()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("allows repeated startup without duplicate identity tables", () => {
    const db = new Database(dbPath)
    __testOnly_migrateIdentityOn(db)
    resetDrizzle()
    getDrizzle()
    __testOnly_migrateIdentityOn(db)

    const studioTables = db
      .prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'studios'",
      )
      .get() as { count: number }
    assert.equal(studioTables.count, 1)
    db.close()
  })
})
