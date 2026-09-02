import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import type Database from "better-sqlite3"
import { getDb } from "../storage/db.js"
import { createDrizzle, resetDrizzle } from "./drizzle.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const IDENTITY_MIGRATIONS_DIR = path.join(__dirname, "migrations")

/**
 * Apply Drizzle-managed identity migrations after legacy SQL migrations.
 * Legacy proofing tables use schema_migrations; identity tables use __drizzle_migrations.
 */
export function migrateIdentity(db?: Database.Database): void {
  resetDrizzle()

  if (!fs.existsSync(IDENTITY_MIGRATIONS_DIR)) {
    throw new Error(`Identity migrations directory not found: ${IDENTITY_MIGRATIONS_DIR}`)
  }

  const connection = db ?? getDb()
  const drizzleDb = createDrizzle(connection)
  migrate(drizzleDb, { migrationsFolder: IDENTITY_MIGRATIONS_DIR })
  backfillExistingInstallations(connection)
}

function backfillExistingInstallations(db: Database.Database): void {
  const studioCount = (
    db.prepare("SELECT COUNT(*) AS count FROM studios").get() as { count: number }
  ).count

  let studioId: string | undefined

  if (studioCount > 0) {
    studioId = (
      db.prepare("SELECT id FROM studios ORDER BY created_at ASC LIMIT 1").get() as
        | { id: string }
        | undefined
    )?.id

    repairLegacyStudioWithoutUsers(db, studioId)
  } else {
    const projectTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'")
      .get() as { name: string } | undefined

    if (!projectTable) {
      return
    }

    const hasProofingData = (
      db.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number }
    ).count

    if (hasProofingData === 0) {
      return
    }

    const now = new Date().toISOString()
    studioId = "legacy-studio"
    db.prepare(
      `INSERT INTO studios (id, name, avatar_path, setup_status, created_at, updated_at)
       VALUES (?, '', NULL, 'pending', ?, ?)`,
    ).run(studioId, now, now)
  }

  if (!studioId) {
    return
  }

  backfillStudioOwnership(db, studioId)
}

function tableHasColumnLocal(
  db: Database.Database,
  table: string,
  column: string,
): boolean {
  const columns = db
    .pragma(`table_info(${table})`) as Array<{ name: string }>
  return columns.some((entry) => entry.name === column)
}

function repairLegacyStudioWithoutUsers(
  db: Database.Database,
  studioId: string | undefined,
): void {
  if (!studioId) {
    return
  }

  const userCount = (
    db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }
  ).count

  if (userCount > 0) {
    return
  }

  db.prepare(
    "UPDATE studios SET setup_status = 'pending', updated_at = ? WHERE id = ? AND setup_status = 'complete'",
  ).run(new Date().toISOString(), studioId)
}

function backfillStudioOwnership(db: Database.Database, studioId: string): void {
  const tables = ["projects", "clients", "leads", "services"] as const

  for (const table of tables) {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table) as { name: string } | undefined

    if (!tableExists || !tableHasColumnLocal(db, table, "studioId")) {
      continue
    }

    db.prepare(`UPDATE ${table} SET studioId = ? WHERE studioId IS NULL`).run(studioId)
  }
}

/** @internal Test helper to run identity migrations on an existing connection. */
export function __testOnly_migrateIdentityOn(db: Database.Database): void {
  migrateIdentity(db)
}
