import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import Database from "better-sqlite3"
import {
  __testOnly_runMigrationsOn,
  __testOnly_tableHasColumn,
  closeDatabase,
  initDatabase,
} from "./db.js"
import { createProject, getProject, updateProject } from "./repository.js"

const LEGACY_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  client TEXT,
  description TEXT,
  startDate TEXT,
  endDate TEXT,
  budget TEXT
);
`

let tempDir = ""

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-client-schema-"))
})

after(() => {
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

function createLegacyDatabase(): string {
  const dbPath = path.join(tempDir, `legacy-${randomSuffix()}.db`)
  const db = new Database(dbPath)
  db.pragma("foreign_keys = ON")
  db.exec(LEGACY_SCHEMA)
  db.close()
  return dbPath
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}

describe("client management schema", () => {
  it("creates leads, contact_log, clients, and projects.clientId on fresh init", () => {
    const dbPath = path.join(tempDir, `fresh-${randomSuffix()}.db`)
    initDatabase(dbPath)

    const db = new Database(dbPath)
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name)

    assert.ok(tables.includes("leads"))
    assert.ok(tables.includes("contact_log"))
    assert.ok(tables.includes("clients"))
    assert.ok(__testOnly_tableHasColumn(db, "projects", "clientId"))
    db.close()
    closeDatabase()
  })

  it("upgrades a legacy database without client management tables", () => {
    const dbPath = createLegacyDatabase()
    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    __testOnly_runMigrationsOn(db)

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name)

    assert.ok(tables.includes("leads"))
    assert.ok(tables.includes("contact_log"))
    assert.ok(tables.includes("clients"))
    assert.ok(__testOnly_tableHasColumn(db, "projects", "clientId"))
    db.close()
  })

  it("enforces contact_log.leadId foreign key", () => {
    const dbPath = path.join(tempDir, `fk-${randomSuffix()}.db`)
    initDatabase(dbPath)

    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")

    assert.throws(() => {
      db.prepare(
        `INSERT INTO contact_log (id, leadId, type, contactedAt, createdAt)
         VALUES ('clog-1', 'missing-lead', 'note', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
      ).run()
    })

    db.close()
    closeDatabase()
  })

  it("links projects to clients via clientId", () => {
    const dbPath = path.join(tempDir, `link-${randomSuffix()}.db`)
    process.env.DB_PATH = dbPath
    initDatabase(dbPath)

    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO clients (id, name, email, createdAt, updatedAt)
       VALUES ('client-1', 'Test Client', 'test@example.com', ?, ?)`,
    ).run(now, now)

    const project = createProject({
      id: "proj-1",
      name: "Linked Project",
      clientId: "client-1",
    })

    assert.equal(project.clientId, "client-1")
    assert.equal(getProject("proj-1")?.clientId, "client-1")

    updateProject("proj-1", { clientId: null })
    assert.equal(getProject("proj-1")?.clientId, undefined)

    db.close()
    closeDatabase()
    delete process.env.DB_PATH
  })

  it("sets projects.clientId to NULL when a client is deleted", () => {
    const dbPath = path.join(tempDir, `cascade-${randomSuffix()}.db`)
    process.env.DB_PATH = dbPath
    initDatabase(dbPath)

    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO clients (id, name, email, createdAt, updatedAt)
       VALUES ('client-del', 'Delete Me', 'del@example.com', ?, ?)`,
    ).run(now, now)

    createProject({
      id: "proj-del",
      name: "Cascade Project",
      clientId: "client-del",
    })

    db.prepare("DELETE FROM clients WHERE id = 'client-del'").run()

    const row = db
      .prepare("SELECT clientId FROM projects WHERE id = 'proj-del'")
      .get() as { clientId: string | null }

    assert.equal(row.clientId, null)

    db.close()
    closeDatabase()
    delete process.env.DB_PATH
  })
})
