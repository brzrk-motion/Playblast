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

const PRE_INVOICES_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  client TEXT,
  clientId TEXT,
  description TEXT,
  startDate TEXT,
  endDate TEXT,
  budget TEXT
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hourEstimate REAL NOT NULL,
  hourlyRate REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('static', 'animated')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE project_services (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  serviceId TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  overrideHours REAL,
  createdAt TEXT NOT NULL,
  UNIQUE (projectId, serviceId)
);

CREATE TABLE schema_migrations (
  id TEXT PRIMARY KEY,
  appliedAt TEXT NOT NULL
);

INSERT INTO schema_migrations (id, appliedAt) VALUES ('001_client_management', datetime('now'));
INSERT INTO schema_migrations (id, appliedAt) VALUES ('002_services', datetime('now'));
INSERT INTO schema_migrations (id, appliedAt) VALUES ('003_project_services', datetime('now'));
INSERT INTO schema_migrations (id, appliedAt) VALUES ('004_project_service_details', datetime('now'));
INSERT INTO schema_migrations (id, appliedAt) VALUES ('005_project_service_override_hours', datetime('now'));
`

let tempDir = ""

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-invoices-schema-"))
})

after(() => {
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}

describe("invoices schema", () => {
  it("creates invoice tables on fresh init", () => {
    const dbPath = path.join(tempDir, `fresh-${randomSuffix()}.db`)
    initDatabase(dbPath)

    const db = new Database(dbPath)
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name)

    assert.ok(tables.includes("invoices"))
    assert.ok(tables.includes("invoice_payments"))
    db.close()
    closeDatabase()
  })

  it("upgrades a database without invoices via migration 006", () => {
    const dbPath = path.join(tempDir, `legacy-${randomSuffix()}.db`)
    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    db.exec(PRE_INVOICES_SCHEMA)
    __testOnly_runMigrationsOn(db)

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name)

    assert.ok(tables.includes("invoices"))
    assert.ok(tables.includes("invoice_payments"))
    db.close()
    closeDatabase()
  })
})
