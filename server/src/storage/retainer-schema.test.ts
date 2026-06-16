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
import {
  createClient,
  getClientWithProjects,
  updateClient,
  upsertRetainerCycleHours,
} from "./repository.js"
import { getCurrentCycleStart } from "../lib/retainer-cycle.js"

let tempDir = ""

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-retainer-schema-"))
})

after(() => {
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}

describe("retainer client schema", () => {
  it("adds retainer columns and retainer_cycle_hours on fresh init", () => {
    const dbPath = path.join(tempDir, `fresh-${randomSuffix()}.db`)
    initDatabase(dbPath)

    const db = new Database(dbPath)
    assert.ok(__testOnly_tableHasColumn(db, "clients", "isRetainer"))
    assert.ok(__testOnly_tableHasColumn(db, "clients", "retainerHours"))
    assert.ok(__testOnly_tableHasColumn(db, "clients", "retainerRate"))
    assert.ok(__testOnly_tableHasColumn(db, "clients", "retainerCycleDay"))

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name)
    assert.ok(tables.includes("retainer_cycle_hours"))
    db.close()
    closeDatabase()
  })

  it("upgrades databases with client management but without retainer fields", () => {
    const dbPath = path.join(tempDir, `legacy-${randomSuffix()}.db`)
    const db = new Database(dbPath)
    db.pragma("foreign_keys = ON")
    db.exec(`
      CREATE TABLE schema_migrations (
        id TEXT PRIMARY KEY,
        appliedAt TEXT NOT NULL
      );

      INSERT INTO schema_migrations (id, appliedAt) VALUES
        ('001_client_management', '2026-01-01T00:00:00.000Z'),
        ('002_services', '2026-01-01T00:00:00.000Z'),
        ('003_project_services', '2026-01-01T00:00:00.000Z'),
        ('004_project_service_details', '2026-01-01T00:00:00.000Z'),
        ('005_project_service_override_hours', '2026-01-01T00:00:00.000Z');

      CREATE TABLE clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        website TEXT,
        notes TEXT,
        convertedFromLeadId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `)

    __testOnly_runMigrationsOn(db)

    assert.ok(__testOnly_tableHasColumn(db, "clients", "isRetainer"))
    assert.ok(__testOnly_tableHasColumn(db, "clients", "retainerCycleDay"))

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'retainer_cycle_hours'",
      )
      .get() as { name: string } | undefined
    assert.ok(table)
    db.close()
  })

  it("computes retainer summary from manual cycle hours", () => {
    const dbPath = path.join(tempDir, `summary-${randomSuffix()}.db`)
    process.env.DB_PATH = dbPath
    initDatabase(dbPath)

    const client = createClient({
      name: "Retainer Co",
      email: "retainer@example.com",
      isRetainer: true,
      retainerHours: 20,
      retainerRate: 100,
      retainerCycleDay: 1,
    })

    const cycleStart = getCurrentCycleStart(1)
    upsertRetainerCycleHours(client.id, cycleStart, 12)

    const detail = getClientWithProjects(client.id)
    assert.ok(detail?.retainerSummary)
    assert.equal(detail.retainerSummary.hoursContracted, 20)
    assert.equal(detail.retainerSummary.hoursLogged, 12)
    assert.equal(detail.retainerSummary.hoursRemaining, 8)
    assert.equal(detail.retainerSummary.estimatedValue, 2000)
    assert.equal(detail.retainerSummary.utilizationPercent, 60)
    assert.equal(detail.retainerSummary.isOverage, false)

    updateClient(client.id, { isRetainer: false })
    const nonRetainer = getClientWithProjects(client.id)
    assert.equal(nonRetainer?.retainerSummary, undefined)

    closeDatabase()
    delete process.env.DB_PATH
  })
})
