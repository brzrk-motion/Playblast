import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { closeDatabase, getDb, initDatabase } from "../storage/db.js"
import {
  ensureDevelopmentDemoVideos,
  seedDevelopmentDatabase,
} from "./seed-development.js"

test("development seed populates the demo workspace once", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-seed-"))

  try {
    initDatabase(path.join(tempDir, "playblast.db"))

    const uploadDir = path.join(tempDir, "uploads")
    assert.equal(seedDevelopmentDatabase(uploadDir), true)
    assert.equal(seedDevelopmentDatabase(uploadDir), false)
    assert.equal(ensureDevelopmentDemoVideos(uploadDir), false)
    assert.equal(
      (getDb().prepare("SELECT COUNT(*) AS count FROM studios").get() as { count: number }).count,
      1,
    )
    assert.deepEqual(
      getDb()
        .prepare("SELECT email, role FROM users ORDER BY id")
        .all(),
      [
        { email: "taylor@playblast.local", role: "account_executive" },
        { email: "admin@playblast.local", role: "admin" },
        { email: "maya@playblast.local", role: "creative" },
        { email: "jordan@playblast.local", role: "proofing" },
      ],
    )
    assert.equal(
      (getDb().prepare("SELECT COUNT(*) AS count FROM leads").get() as { count: number }).count,
      5,
    )
    assert.equal(
      (getDb().prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number }).count,
      4,
    )
    assert.equal(
      (getDb().prepare("SELECT COUNT(*) AS count FROM invoices").get() as { count: number }).count,
      3,
    )
    assert.equal(
      fs.existsSync(
        path.join(
          uploadDir,
          "project-northstar-launch",
          "deliv-northstar-hero",
          "v2",
          "northstar-hero-v2.mp4",
        ),
      ),
      true,
    )
    fs.rmSync(
      path.join(
        uploadDir,
        "project-northstar-launch",
        "deliv-northstar-hero",
        "v2",
        "northstar-hero-v2.mp4",
      ),
    )
    assert.equal(ensureDevelopmentDemoVideos(uploadDir), true)
  } finally {
    closeDatabase()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("development seed is disabled in production", () => {
  const previousNodeEnv = process.env.NODE_ENV
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-seed-prod-"))

  try {
    process.env.NODE_ENV = "production"
    initDatabase(path.join(tempDir, "playblast.db"))
    assert.equal(seedDevelopmentDatabase(path.join(tempDir, "uploads")), false)
    assert.equal(
      (getDb().prepare("SELECT COUNT(*) AS count FROM studios").get() as { count: number }).count,
      0,
    )
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
    closeDatabase()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
