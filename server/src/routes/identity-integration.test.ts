import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import { authHeaders, setupAdminAccount } from "../test/auth-helpers.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-phase1-integration-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  process.env.SESSION_SECRET = "phase1-integration-test-secret-32chars"
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
    assert.equal(studioResponse.status, 401)
    assert.equal(studioBody.code, "UNAUTHENTICATED")
  })

  it("blocks proofing APIs until setup completes", async () => {
    const projectsResponse = await fetch(`${baseUrl}/api/projects`)
    assert.equal(projectsResponse.status, 401)
    const body = (await projectsResponse.json()) as { code: string }
    assert.equal(body.code, "UNAUTHENTICATED")
  })

  it("blocks proofing APIs for an admin session before setup completes", async () => {
    const admin = await setupAdminAccount(baseUrl)

    const createResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: authHeaders(admin.cookies, admin.csrfToken),
      body: JSON.stringify({ name: "Phase 1 Proofing Project" }),
    })
    assert.equal(createResponse.status, 403)
    const createBody = (await createResponse.json()) as { code: string }
    assert.equal(createBody.code, "SETUP_NOT_COMPLETE")

    const listResponse = await fetch(`${baseUrl}/api/projects`, {
      headers: authHeaders(admin.cookies, admin.csrfToken, false),
    })
    assert.equal(listResponse.status, 403)
    const listBody = (await listResponse.json()) as { code: string }
    assert.equal(listBody.code, "SETUP_NOT_COMPLETE")

    const setupResponse = await fetch(`${baseUrl}/api/setup/status`)
    const setup = (await setupResponse.json()) as {
      status: string
      setupComplete: boolean
    }
    assert.equal(setup.setupComplete, false)
  })
})
