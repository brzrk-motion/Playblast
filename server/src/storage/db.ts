import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import type Database from "better-sqlite3"
import DatabaseConstructor from "better-sqlite3"
import { migrateIdentity } from "../db/migrate-identity.js"
import { resetDrizzle } from "../db/drizzle.js"
import { config } from "../config/env.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = path.join(__dirname, "schema.sql")
const MIGRATIONS_DIR = path.join(__dirname, "migrations")

let dbInstance: Database.Database | null = null

export function getDbPath(): string {
  return config.dbPath
}

function tableHasColumn(
  db: Database.Database,
  table: string,
  column: string,
): boolean {
  const columns = db
    .pragma(`table_info(${table})`) as Array<{ name: string }>
  return columns.some((entry) => entry.name === column)
}

function ensureSchemaMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL
    )
  `)
}

function hasMigration(db: Database.Database, id: string): boolean {
  const row = db
    .prepare("SELECT id FROM schema_migrations WHERE id = ?")
    .get(id) as { id: string } | undefined
  return row !== undefined
}

function recordMigration(db: Database.Database, id: string): void {
  db.prepare(
    "INSERT INTO schema_migrations (id, appliedAt) VALUES (?, ?)",
  ).run(id, new Date().toISOString())
}

function tableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(table) as { name: string } | undefined
  return row !== undefined
}

function upgradeProjectServicesTable(db: Database.Database): void {
  if (!tableExists(db, "project_services")) {
    return
  }

  if (tableHasColumn(db, "project_services", "id")) {
    return
  }

  const legacyRows = db
    .prepare(
      "SELECT projectId, serviceId, createdAt FROM project_services ORDER BY createdAt ASC",
    )
    .all() as Array<{
    projectId: string
    serviceId: string
    createdAt: string
  }>

  db.exec(`
    CREATE TABLE project_services_new (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      serviceId TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
      createdAt TEXT NOT NULL,
      UNIQUE (projectId, serviceId)
    )
  `)

  const insert = db.prepare(
    `INSERT INTO project_services_new (
      id, projectId, serviceId, quantity, createdAt
    ) VALUES (?, ?, ?, ?, ?)`,
  )

  for (const row of legacyRows) {
    insert.run(randomUUID(), row.projectId, row.serviceId, 1, row.createdAt)
  }

  db.exec("DROP TABLE project_services")
  db.exec("ALTER TABLE project_services_new RENAME TO project_services")
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_project_services_serviceId ON project_services(serviceId)",
  )
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_project_services_projectId ON project_services(projectId)",
  )
}

function runMigrations(db: Database.Database): void {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return
  }

  ensureSchemaMigrationsTable(db)

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  for (const file of files) {
    const id = file.replace(/\.sql$/, "")
    if (hasMigration(db, id)) {
      continue
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")

    if (id === "006_project_archived_at") {
      if (tableExists(db, "projects")) {
        if (!tableHasColumn(db, "projects", "archived_at")) {
          db.exec("ALTER TABLE projects ADD COLUMN archived_at TEXT")
        }
        db.exec(sql)
      }
    } else {
      db.exec(sql)
    }

    if (id === "001_client_management" && !tableHasColumn(db, "projects", "clientId")) {
      db.exec(
        "ALTER TABLE projects ADD COLUMN clientId TEXT REFERENCES clients(id) ON DELETE SET NULL",
      )
    }

    if (id === "001_client_management") {
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_projects_clientId ON projects(clientId)",
      )
    }

    if (id === "004_project_service_details") {
      upgradeProjectServicesTable(db)
    }

    if (
      id === "005_project_service_override_hours" &&
      !tableHasColumn(db, "project_services", "overrideHours")
    ) {
      db.exec("ALTER TABLE project_services ADD COLUMN overrideHours REAL")
    }

    if (
      id === "006_project_notes" &&
      tableExists(db, "projects") &&
      !tableHasColumn(db, "projects", "notes")
    ) {
      db.exec("ALTER TABLE projects ADD COLUMN notes TEXT")
    }

    if (id === "006_retainer_clients") {
      if (tableExists(db, "clients")) {
        if (!tableHasColumn(db, "clients", "isRetainer")) {
          db.exec(
            "ALTER TABLE clients ADD COLUMN isRetainer INTEGER NOT NULL DEFAULT 0",
          )
        }
        if (!tableHasColumn(db, "clients", "retainerHours")) {
          db.exec("ALTER TABLE clients ADD COLUMN retainerHours REAL")
        }
        if (!tableHasColumn(db, "clients", "retainerRate")) {
          db.exec("ALTER TABLE clients ADD COLUMN retainerRate REAL")
        }
        if (!tableHasColumn(db, "clients", "retainerCycleDay")) {
          db.exec("ALTER TABLE clients ADD COLUMN retainerCycleDay INTEGER")
        }
      }

      if (tableExists(db, "clients") && !tableExists(db, "retainer_cycle_hours")) {
        db.exec(`
          CREATE TABLE retainer_cycle_hours (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            cycleStart TEXT NOT NULL,
            hoursLogged REAL NOT NULL DEFAULT 0 CHECK (hoursLogged >= 0),
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            UNIQUE (clientId, cycleStart)
          )
        `)
        db.exec(
          "CREATE INDEX IF NOT EXISTS idx_retainer_cycle_hours_clientId ON retainer_cycle_hours(clientId)",
        )
      }
    }

    recordMigration(db, id)
  }
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    initDatabase()
  }

  return dbInstance!
}

export function initDatabase(dbPath?: string): void {
  closeDatabase()

  const resolvedPath = dbPath ?? getDbPath()
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })

  dbInstance = new DatabaseConstructor(resolvedPath)
  dbInstance.pragma("journal_mode = WAL")
  dbInstance.pragma("foreign_keys = ON")
  dbInstance.exec(fs.readFileSync(SCHEMA_PATH, "utf8"))
  runMigrations(dbInstance)
  migrateIdentity(dbInstance)
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    resetDrizzle()
  }
}

export function withTransaction<T>(fn: () => T): T {
  const db = getDb()
  return db.transaction(fn)()
}

/** @internal Test helper for migration coverage. */
export function __testOnly_runMigrationsOn(
  db: Database.Database,
): void {
  runMigrations(db)
}

/** @internal Test helper for column checks. */
export function __testOnly_tableHasColumn(
  db: Database.Database,
  table: string,
  column: string,
): boolean {
  return tableHasColumn(db, table, column)
}
