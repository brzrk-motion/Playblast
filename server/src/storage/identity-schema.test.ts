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
    assert.ok(__testOnly_tableHasColumn(db, "sessions", "token_hash"))

    const userEmailIndex = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'users_email_normalized_unique'",
      )
      .get() as { name: string } | undefined
    assert.equal(userEmailIndex?.name, "users_email_normalized_unique")

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

  it("backfills a complete studio when proofing data already exists", () => {
    const studio = __testOnly_getStudioById("legacy-studio")
    assert.ok(studio)
    assert.equal(studio.setupStatus, "complete")

    const status = getSetupStatusResponse()
    assert.equal(status.status, "complete")
    assert.equal(status.setupComplete, true)
  })

  it("keeps legacy project rows intact after identity migration", () => {
    const db = new Database(dbPath, { readonly: true })
    const project = db
      .prepare("SELECT id, name FROM projects WHERE id = ?")
      .get("project-1") as { id: string; name: string } | undefined

    assert.deepEqual(project, { id: "project-1", name: "Legacy Project" })
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
