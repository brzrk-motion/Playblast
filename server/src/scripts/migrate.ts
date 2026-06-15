import { config } from "../config/env.js"
import { closeDatabase, getDb, initDatabase } from "../storage/db.js"

function main(): void {
  console.log(`Applying database schema and migrations to ${config.dbPath}`)

  initDatabase()

  const applied = getDb()
    .prepare("SELECT id FROM schema_migrations ORDER BY id")
    .all() as Array<{ id: string }>

  if (applied.length === 0) {
    console.log("No migrations recorded (fresh database initialized).")
  } else {
    console.log(`Applied migrations (${applied.length}):`)
    for (const { id } of applied) {
      console.log(`  - ${id}`)
    }
  }

  closeDatabase()
  console.log("Database is up to date.")
}

try {
  main()
} catch (error) {
  console.error("Migration failed:")
  console.error(error)
  process.exitCode = 1
  closeDatabase()
}
