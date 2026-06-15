import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import Database from "better-sqlite3"
import {
  __testOnly_runMigrationsOn,
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
})
