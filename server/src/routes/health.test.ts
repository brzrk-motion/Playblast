import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

let server: Server
let baseUrl: string
let tempDir = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-health-"))
  process.env.DB_PATH = path.join(tempDir, "playblast.db")
  process.env.UPLOAD_DIR = path.join(tempDir, "uploads")
  process.env.SESSION_SECRET = "health-test-session-secret-32chars-min"

  initDatabase()
  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server")
  }

  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("GET /health", () => {
  it("returns 200 with status, database, uptime, and timestamp", async () => {
    const response = await fetch(`${baseUrl}/health`)

    assert.equal(response.status, 200)

    const body = (await response.json()) as {
      status: string
      database: string
      uptime: number
      timestamp: string
    }

    assert.equal(body.status, "ok")
    assert.equal(body.database, "ok")
    assert.equal(typeof body.uptime, "number")
    assert.ok(body.uptime >= 0)
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
