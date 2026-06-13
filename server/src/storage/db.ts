import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import { config } from "../config/env.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = path.join(__dirname, "schema.sql")

let dbInstance: Database.Database | null = null

export function getDbPath(): string {
  return config.dbPath
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

  dbInstance = new Database(resolvedPath)
  dbInstance.pragma("journal_mode = WAL")
  dbInstance.pragma("foreign_keys = ON")
  dbInstance.exec(fs.readFileSync(SCHEMA_PATH, "utf8"))
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
