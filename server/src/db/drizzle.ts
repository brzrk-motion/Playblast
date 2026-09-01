import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import type Database from "better-sqlite3"
import { getDb } from "../storage/db.js"
import { identitySchema } from "./schema/index.js"

export type IdentityDatabase = BetterSQLite3Database<typeof identitySchema>

let drizzleInstance: IdentityDatabase | null = null

export function createDrizzle(db: Database.Database): IdentityDatabase {
  return drizzle(db, { schema: identitySchema })
}

export function getDrizzle(): IdentityDatabase {
  if (!drizzleInstance) {
    drizzleInstance = createDrizzle(getDb())
  }
  return drizzleInstance
}

/** @internal Reset cached Drizzle instance when the underlying DB is closed. */
export function resetDrizzle(): void {
  drizzleInstance = null
}
