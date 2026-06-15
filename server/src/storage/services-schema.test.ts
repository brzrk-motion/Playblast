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

const PRE_SERVICES_SCHEMA = `
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

CREATE TABLE schema_migrations (
  id TEXT PRIMARY KEY,
  appliedAt TEXT NOT NULL
);

INSERT INTO schema_migrations (id, appliedAt) VALUES ('001_client_management', datetime('now'));
`

let tempDir = ""

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-services-schema-"))
})

after(() => {
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}

describe("services schema", () => {
  it("creates services table on fresh init", () => {
    const dbPath = path.join(tempDir, `fresh-${randomSuffix()}.db`)
    initDatabase(dbPath)

    const db = new Database(dbPath)
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name)

    assert.ok(tables.includes("services"))
    assert.ok(tables.includes("project_services"))
    db.close()
    closeDatabase()
  })

  it("upgrades a database without services via migration 002", () => {
    const dbPath = path.join(tempDir, `legacy-${randomSuffix()}.db`)
    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    db.exec(PRE_SERVICES_SCHEMA)
    __testOnly_runMigrationsOn(db)

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name)

    assert.ok(tables.includes("services"))

    assert.throws(() => {
      db.prepare(
        `INSERT INTO services (
          id, name, hourEstimate, hourlyRate, type, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        "svc-1",
        "Invalid Type",
        1,
        100,
        "video",
        new Date().toISOString(),
        new Date().toISOString(),
      )
    })

    db.close()
  })

  it("upgrades legacy project_services to id and quantity via migration 004", () => {
    const dbPath = path.join(tempDir, `legacy-ps-${randomSuffix()}.db`)
    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    db.exec(PRE_SERVICES_SCHEMA)
    db.exec(`
      CREATE TABLE services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        hourEstimate REAL NOT NULL,
        hourlyRate REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('static', 'animated')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      INSERT INTO projects (id, name, createdAt, status)
      VALUES ('proj-1', 'Legacy Project', datetime('now'), 'active');

      INSERT INTO services (
        id, name, hourEstimate, hourlyRate, type, createdAt, updatedAt
      ) VALUES (
        'svc-1', 'Legacy Service', 1, 100, 'static', datetime('now'), datetime('now')
      );

      CREATE TABLE project_services (
        projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        serviceId TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        createdAt TEXT NOT NULL,
        PRIMARY KEY (projectId, serviceId)
      );

      INSERT INTO project_services (projectId, serviceId, createdAt)
      VALUES ('proj-1', 'svc-1', datetime('now'));

      INSERT INTO schema_migrations (id, appliedAt)
      VALUES ('002_services', datetime('now')), ('003_project_services', datetime('now'));
    `)

    __testOnly_runMigrationsOn(db)

    assert.ok(__testOnly_tableHasColumn(db, "project_services", "id"))
    assert.ok(__testOnly_tableHasColumn(db, "project_services", "quantity"))

    const row = db
      .prepare(
        "SELECT id, projectId, serviceId, quantity FROM project_services WHERE projectId = ?",
      )
      .get("proj-1") as {
      id: string
      projectId: string
      serviceId: string
      quantity: number
    }

    assert.equal(row.projectId, "proj-1")
    assert.equal(row.serviceId, "svc-1")
    assert.equal(row.quantity, 1)
    assert.match(row.id, /^[0-9a-f-]{36}$/i)

    db.close()
  })

  it("adds overrideHours via migration 005", () => {
    const dbPath = path.join(tempDir, `legacy-override-${randomSuffix()}.db`)
    initDatabase(dbPath)

    const db = new Database(dbPath)
    assert.ok(__testOnly_tableHasColumn(db, "project_services", "overrideHours"))
    db.close()
    closeDatabase()
  })
})
