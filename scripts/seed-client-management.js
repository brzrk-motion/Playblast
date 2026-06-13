#!/usr/bin/env node
/**
 * Applies client-management migrations and optionally loads dev seed data.
 *
 * Usage:
 *   node scripts/seed-client-management.js              # migrate + seed
 *   node scripts/seed-client-management.js --migrate-only
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"
import Database from "better-sqlite3"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")

dotenv.config({ path: path.join(repoRoot, ".env") })

const dbPath =
  process.env.DB_PATH ?? path.join(repoRoot, "server", "data", "playblast.db")
const migrateOnly = process.argv.includes("--migrate-only")
const schemaPath = path.join(
  repoRoot,
  "server",
  "src",
  "storage",
  "schema.sql",
)
const migrationPath = path.join(
  repoRoot,
  "server",
  "src",
  "storage",
  "migrations",
  "001_client_management.sql",
)
const seedPath = path.join(
  repoRoot,
  "server",
  "data",
  "seed-client-management.sql",
)

function tableHasColumn(db, table, column) {
  const columns = db.pragma(`table_info(${table})`)
  return columns.some((entry) => entry.name === column)
}

function ensureSchemaMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL
    )
  `)
}

function hasMigration(db, id) {
  return (
    db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(id) !==
    undefined
  )
}

function recordMigration(db, id) {
  db.prepare(
    "INSERT INTO schema_migrations (id, appliedAt) VALUES (?, ?)",
  ).run(id, new Date().toISOString())
}

function bootstrapDatabase(db) {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaPath}`)
  }

  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.exec(fs.readFileSync(schemaPath, "utf8"))
}

function applyClientManagementMigration(db) {
  ensureSchemaMigrationsTable(db)

  const migrationId = "001_client_management"
  if (hasMigration(db, migrationId)) {
    console.log(`Migration ${migrationId} already applied.`)
    return
  }

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration not found: ${migrationPath}`)
  }

  db.exec(fs.readFileSync(migrationPath, "utf8"))

  if (!tableHasColumn(db, "projects", "clientId")) {
    db.exec(
      "ALTER TABLE projects ADD COLUMN clientId TEXT REFERENCES clients(id) ON DELETE SET NULL",
    )
  }

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_projects_clientId ON projects(clientId)",
  )

  recordMigration(db, migrationId)
  console.log(`Applied migration ${migrationId}.`)
}

function loadSeedData(db) {
  const leadCount = db.prepare("SELECT COUNT(*) AS count FROM leads").get()
    .count

  if (leadCount > 0) {
    console.log("Seed skipped: leads table is not empty.")
    return
  }

  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`)
  }

  db.exec(fs.readFileSync(seedPath, "utf8"))
  console.log("Loaded client management seed data.")
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const isNewDatabase = !fs.existsSync(dbPath)
const db = new Database(dbPath)

try {
  if (isNewDatabase) {
    bootstrapDatabase(db)
    ensureSchemaMigrationsTable(db)
    recordMigration(db, "001_client_management")
    console.log(`Created database at ${dbPath}`)
  } else {
    applyClientManagementMigration(db)
  }

  if (!migrateOnly) {
    loadSeedData(db)
  }
} finally {
  db.close()
}
