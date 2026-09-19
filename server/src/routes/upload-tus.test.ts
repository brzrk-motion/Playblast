import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import {
  authHeaders,
  completeStudioSetup,
  setupAdminAccount,
} from "../test/auth-helpers.js"
import { tusUploadVersion } from "../test/tus-upload-helpers.js"

let server: Server
let baseUrl = ""
let tempDir = ""
let uploadDir = ""
let adminCookies: string[] = []
let adminCsrf = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-tus-upload-"))
  uploadDir = path.join(tempDir, "uploads")
  fs.mkdirSync(uploadDir, { recursive: true })
  process.env.UPLOAD_DIR = uploadDir
  process.env.DB_PATH = path.join(tempDir, "test.db")
  process.env.SESSION_SECRET = "tus-upload-test-session-secret-32chars"
  initDatabase(process.env.DB_PATH)

  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server")
  }

  baseUrl = `http://127.0.0.1:${address.port}`
  const admin = await setupAdminAccount(baseUrl)
  adminCookies = admin.cookies
  adminCsrf = admin.csrfToken
  await completeStudioSetup(baseUrl, adminCookies, adminCsrf)
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("tus version uploads", () => {
  it("rejects uploads without required metadata", async () => {
    const response = await fetch(`${baseUrl}/api/uploads/tus`, {
      method: "POST",
      headers: {
        ...authHeaders(adminCookies, adminCsrf, false),
        "Tus-Resumable": "1.0.0",
        "Upload-Length": "8",
      },
    })

    assert.equal(response.status, 400)
  })

  it("uploads a version via tus and stores the file in the version directory", async () => {
    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: authHeaders(adminCookies, adminCsrf),
      body: JSON.stringify({ name: "Tus Upload Project" }),
    })
    assert.equal(projectResponse.status, 201)
    const project = (await projectResponse.json()) as { id: string }

    const deliverableResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/deliverables`,
      {
        method: "POST",
        headers: authHeaders(adminCookies, adminCsrf),
        body: JSON.stringify({ name: "Tus Upload Deliverable" }),
      },
    )
    assert.equal(deliverableResponse.status, 201)
    const deliverable = (await deliverableResponse.json()) as { id: string }

    const bytes = Buffer.alloc(1024, 0x7a)
    const upload = await tusUploadVersion(
      baseUrl,
      adminCookies,
      adminCsrf,
      deliverable.id,
      "v1",
      "tus-cut.mp4",
      bytes,
    )

    assert.equal(upload.filename, "tus-cut.mp4")
    assert.equal(upload.size, bytes.length)
    assert.ok(upload.versionId)

    const storedPath = path.join(
      uploadDir,
      project.id,
      deliverable.id,
      "v1",
      "tus-cut.mp4",
    )
    assert.equal(fs.existsSync(storedPath), true)
    assert.equal(fs.readFileSync(storedPath).length, bytes.length)
  })
})
