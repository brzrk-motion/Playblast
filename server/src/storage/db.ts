import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type Database from "better-sqlite3"
import DatabaseConstructor from "better-sqlite3"
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
    db.exec(sql)

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
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
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
