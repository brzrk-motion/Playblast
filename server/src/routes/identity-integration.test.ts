import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-phase1-integration-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  initDatabase(dbPath)

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

  delete process.env.DB_PATH
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("Phase 1 identity integration", () => {
  it("blocks studio APIs until setup completes on a fresh database", async () => {
    const setupResponse = await fetch(`${baseUrl}/api/setup/status`)
    const setup = (await setupResponse.json()) as {
      status: string
      setupComplete: boolean
    }

    assert.equal(setup.status, "pending")
    assert.equal(setup.setupComplete, false)

    const studioResponse = await fetch(`${baseUrl}/api/studio`)
    const studioBody = (await studioResponse.json()) as { code: string }
    assert.equal(studioResponse.status, 403)
    assert.equal(studioBody.code, "SETUP_NOT_COMPLETE")
  })

  it("keeps legacy proofing APIs available while identity is pending", async () => {
    const projectsResponse = await fetch(`${baseUrl}/api/projects`)
    assert.equal(projectsResponse.status, 200)
    const projects = (await projectsResponse.json()) as unknown[]
    assert.ok(Array.isArray(projects))
  })

  it("preserves proofing data after seeding a legacy project fixture", async () => {
    const createResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Phase 1 Proofing Project" }),
    })
    assert.equal(createResponse.status, 201)

    const listResponse = await fetch(`${baseUrl}/api/projects`)
    const projects = (await listResponse.json()) as Array<{ name: string }>
    assert.ok(projects.some((project) => project.name === "Phase 1 Proofing Project"))

    const setupResponse = await fetch(`${baseUrl}/api/setup/status`)
    const setup = (await setupResponse.json()) as { status: string }
    assert.equal(setup.status, "pending")
  })
})
