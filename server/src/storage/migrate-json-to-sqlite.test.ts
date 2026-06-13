import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import Database from "better-sqlite3"

const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../..",
)
const migrationScript = path.join(repoRoot, "scripts/migrate-json-to-sqlite.js")
const sampleStore = path.join(repoRoot, "server/data/store.json")

let tempDir = ""
let dbPath = ""

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-migrate-"))
  dbPath = path.join(tempDir, "migrated.db")
})

after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("migrate-json-to-sqlite", () => {
  it("imports an existing store.json into SQLite", () => {
    execFileSync(
      process.execPath,
      [migrationScript, sampleStore],
      {
        env: {
          ...process.env,
          DB_PATH: dbPath,
        },
        stdio: "pipe",
      },
    )

    assert.equal(fs.existsSync(dbPath), true)

    const db = new Database(dbPath, { readonly: true })
    const projectCount = (
      db.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number }
    ).count
    const versionCount = (
      db.prepare("SELECT COUNT(*) AS count FROM versions").get() as { count: number }
    ).count
    const commentCount = (
      db.prepare("SELECT COUNT(*) AS count FROM comments").get() as { count: number }
    ).count
    db.close()

    const source = JSON.parse(fs.readFileSync(sampleStore, "utf8")) as {
      projects: unknown[]
      versions: unknown[]
      comments: unknown[]
    }

    assert.equal(projectCount, source.projects.length)
    assert.equal(versionCount, source.versions.length)
    assert.ok(commentCount <= source.comments.length)
  })
})
