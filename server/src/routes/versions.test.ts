import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { getUploadDir } from "../config/paths.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import {
  createProject,
  createDeliverable,
  createVersion,
} from "../storage/repository.js"
import {
  authHeaders,
  completeStudioSetup,
  setupAdminAccount,
} from "../test/auth-helpers.js"

let tempDir = ""
let dbPath = ""
let uploadRoot = ""
let server: Server
let baseUrl = ""
let adminCookies: string[] = []
let adminCsrf = ""
let studioId = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-download-"))
  dbPath = path.join(tempDir, "test.db")
  uploadRoot = path.join(tempDir, "uploads")
  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadRoot
  process.env.SESSION_SECRET = "versions-test-session-secret-32chars"
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

  const admin = await setupAdminAccount(baseUrl)
  adminCookies = admin.cookies
  adminCsrf = admin.csrfToken
  studioId = admin.session.studio.id
  await completeStudioSetup(baseUrl, adminCookies, adminCsrf)
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  delete process.env.DB_PATH
  delete process.env.UPLOAD_DIR
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("GET /api/versions/:versionId/download", () => {
  it("streams the file with Content-Disposition attachment", async () => {
    const project = createProject({
      studioId: studioId,
      id: "brand-video",
      name: "Brand Video",
    })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Hero Spot",
    })
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v3",
      filename: "render.mp4",
    })

    const uploadDir = getUploadDir(project.id, deliverable.id, version.label)
    fs.mkdirSync(uploadDir, { recursive: true })
    fs.writeFileSync(path.join(uploadDir, version.filename), Buffer.alloc(512, 0xcd))

    const response = await fetch(
      `${baseUrl}/api/versions/${version.id}/download`,
      { headers: authHeaders(adminCookies, adminCsrf, false) },
    )

    assert.equal(response.status, 200)
    assert.equal(response.headers.get("content-type"), "video/mp4")
    assert.equal(
      response.headers.get("content-disposition"),
      'attachment; filename="brand-video-v3.mp4"',
    )
    assert.equal(response.headers.get("content-length"), "512")

    const body = Buffer.from(await response.arrayBuffer())
    assert.equal(body.length, 512)
    assert.equal(body[0], 0xcd)
  })

  it("returns 404 when the version does not exist", async () => {
    const response = await fetch(`${baseUrl}/api/versions/missing-id/download`, {
      headers: authHeaders(adminCookies, adminCsrf, false),
    })
    assert.equal(response.status, 404)
  })

  it("returns 404 when the video file is missing", async () => {
    const project = createProject({
      studioId: studioId,
      id: "missing-file",
      name: "Missing File",
    })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Spot",
    })
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "missing.mp4",
    })

    const response = await fetch(
      `${baseUrl}/api/versions/${version.id}/download`,
      { headers: authHeaders(adminCookies, adminCsrf, false) },
    )
    assert.equal(response.status, 404)
  })
})
