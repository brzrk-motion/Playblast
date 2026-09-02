import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { hashPasswordSync, normalizeEmail } from "../auth/password.js"
import { getDrizzle } from "../db/drizzle.js"
import { studios, users } from "../db/schema/identity.js"
import { closeDatabase, getDb, initDatabase } from "../storage/db.js"
import {
  authHeaders,
  completeStudioSetup,
  cookieHeader,
  loginAccount,
  setupAdminAccount,
} from "../test/auth-helpers.js"

const ADMIN_PASSWORD = "correct horse battery 99"
const CREATIVE_PASSWORD = "creative password 99 ok"
const PROOFING_PASSWORD = "proofing password 99 ok"

let tempDir = ""
let uploadDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

let adminCookies: string[] = []
let adminCsrf = ""
let adminUserId = ""
let adminUserName = ""
let creativeCookies: string[] = []
let creativeCsrf = ""
let creativeUserId = ""
let creativeUserName = ""
let proofingCookies: string[] = []
let proofingCsrf = ""
let proofingUserName = ""

let primaryStudioId = ""
let otherStudioId = ""
let otherProjectId = ""
let otherDeliverableId = ""
let otherVersionId = ""

const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR
const previousSessionSecret = process.env.SESSION_SECRET
const previousNodeEnv = process.env.NODE_ENV

function insertRoleUser(
  studioId: string,
  role: "creative" | "proofing",
  email: string,
  password: string,
  name: string,
) {
  const db = getDrizzle()
  const now = new Date().toISOString()
  const id = randomUUID()
  db.insert(users)
    .values({
      id,
      studioId,
      name,
      email,
      emailNormalized: normalizeEmail(email),
      passwordHash: hashPasswordSync(password),
      role,
      disabled: false,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  return id
}

async function createProject(
  cookies: string[],
  csrfToken: string,
  name: string,
): Promise<{ id: string }> {
  const response = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({ name }),
  })
  assert.equal(response.status, 201)
  return (await response.json()) as { id: string }
}

async function createDeliverable(
  cookies: string[],
  csrfToken: string,
  projectId: string,
  name: string,
): Promise<{ id: string }> {
  const response = await fetch(`${baseUrl}/api/projects/${projectId}/deliverables`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({ name }),
  })
  assert.equal(response.status, 201)
  return (await response.json()) as { id: string }
}

async function uploadVersion(
  cookies: string[],
  csrfToken: string,
  deliverableId: string,
  versionLabel: string,
  filename: string,
  bytes: Buffer,
): Promise<{ versionId: string; filename: string }> {
  const formData = new FormData()
  formData.append("video", new Blob([bytes], { type: "video/mp4" }), filename)

  const response = await fetch(
    `${baseUrl}/api/deliverables/${deliverableId}/versions/${versionLabel}/upload`,
    {
      method: "POST",
      headers: authHeaders(cookies, csrfToken, false),
      body: formData,
    },
  )
  assert.equal(response.status, 201)
  const body = (await response.json()) as { versionId: string; filename: string }
  return body
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-phase6-"))
  dbPath = path.join(tempDir, "test.db")
  uploadDir = path.join(tempDir, "uploads")
  fs.mkdirSync(uploadDir, { recursive: true })

  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadDir
  process.env.SESSION_SECRET = "phase-six-test-secret-32chars-min"
  process.env.NODE_ENV = "development"

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
  adminUserId = admin.session.user.id
  adminUserName = admin.session.user.name
  primaryStudioId = admin.session.studio.id

  await completeStudioSetup(baseUrl, adminCookies, adminCsrf)

  creativeUserId = insertRoleUser(
    primaryStudioId,
    "creative",
    "creative@fixture.studio",
    CREATIVE_PASSWORD,
    "Fixture Creative",
  )
  insertRoleUser(
    primaryStudioId,
    "proofing",
    "proofing@fixture.studio",
    PROOFING_PASSWORD,
    "Fixture Proofing",
  )

  const creative = await loginAccount(baseUrl, "creative@fixture.studio", CREATIVE_PASSWORD)
  creativeCookies = creative.cookies
  creativeCsrf = creative.csrfToken
  creativeUserName = creative.session.user.name

  const proofing = await loginAccount(baseUrl, "proofing@fixture.studio", PROOFING_PASSWORD)
  proofingCookies = proofing.cookies
  proofingCsrf = proofing.csrfToken
  proofingUserName = proofing.session.user.name

  const now = new Date().toISOString()
  otherStudioId = "studio-fixture-other"
  getDrizzle()
    .insert(studios)
    .values({
      id: otherStudioId,
      name: "Other Studio",
      setupStatus: "complete",
      createdAt: now,
      updatedAt: now,
    })
    .run()

  const db = getDb()
  otherProjectId = randomUUID()
  otherDeliverableId = randomUUID()
  otherVersionId = randomUUID()
  db.prepare(
    `INSERT INTO projects (id, name, createdAt, status, studioId)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(otherProjectId, "Other Studio Project", now, "active", otherStudioId)
  db.prepare(
    `INSERT INTO deliverables (id, projectId, name, status, createdAt, "order")
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(otherDeliverableId, otherProjectId, "Other Deliverable", "not_started", now, 0)
  db.prepare(
    `INSERT INTO versions (id, projectId, deliverableId, label, filename, uploadedAt, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    otherVersionId,
    otherProjectId,
    otherDeliverableId,
    "v1",
    "other.mp4",
    now,
    "pending_review",
  )
})

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })

  if (previousDbPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousDbPath
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR
  else process.env.UPLOAD_DIR = previousUploadDir
  if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = previousSessionSecret
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv
})

describe("Phase 6 authenticated proofing workflow", () => {
  it("runs Admin end-to-end proofing workflow", async () => {
    const project = await createProject(adminCookies, adminCsrf, "Admin Proofing Project")
    const deliverable = await createDeliverable(
      adminCookies,
      adminCsrf,
      project.id,
      "Hero Spot",
    )
    const videoBytes = Buffer.alloc(256, 0x42)
    const upload = await uploadVersion(
      adminCookies,
      adminCsrf,
      deliverable.id,
      "v1",
      "hero.mp4",
      videoBytes,
    )

    const playback = await fetch(
      `${baseUrl}/video/${project.id}/${deliverable.id}/v1/hero.mp4`,
      {
        headers: { Range: "bytes=0-15", Cookie: cookieHeader(adminCookies) },
      },
    )
    assert.equal(playback.status, 206)

    const commentResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: authHeaders(adminCookies, adminCsrf),
      body: JSON.stringify({
        versionId: upload.versionId,
        timestamp: 1.5,
        body: "Soften the logo highlight",
        author: "Spoofed Author",
      }),
    })
    assert.equal(commentResponse.status, 201)
    const comment = (await commentResponse.json()) as {
      author: string
      authorUserId: string
    }
    assert.equal(comment.author, adminUserName)
    assert.equal(comment.authorUserId, adminUserId)
    assert.notEqual(comment.author, "Spoofed Author")

    const approveResponse = await fetch(
      `${baseUrl}/api/versions/${upload.versionId}/status`,
      {
        method: "PATCH",
        headers: authHeaders(adminCookies, adminCsrf),
        body: JSON.stringify({ status: "approved" }),
      },
    )
    assert.equal(approveResponse.status, 200)

    const downloadResponse = await fetch(
      `${baseUrl}/api/versions/${upload.versionId}/download`,
      { headers: authHeaders(adminCookies, adminCsrf, false) },
    )
    assert.equal(downloadResponse.status, 200)
    assert.equal(Buffer.from(await downloadResponse.arrayBuffer()).length, videoBytes.length)
  })

  it("runs Creative upload/version/proofing workflow", async () => {
    const project = await createProject(creativeCookies, creativeCsrf, "Creative Proofing Project")
    const deliverable = await createDeliverable(
      creativeCookies,
      creativeCsrf,
      project.id,
      "Editorial Cut",
    )
    const upload = await uploadVersion(
      creativeCookies,
      creativeCsrf,
      deliverable.id,
      "v1",
      "edit.mp4",
      Buffer.alloc(128, 0x11),
    )

    const commentResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: authHeaders(creativeCookies, creativeCsrf),
      body: JSON.stringify({
        versionId: upload.versionId,
        timestamp: 2,
        body: "Check the lower third timing",
      }),
    })
    assert.equal(commentResponse.status, 201)
    const comment = (await commentResponse.json()) as {
      author: string
      authorUserId: string
    }
    assert.equal(comment.author, creativeUserName)
    assert.equal(comment.authorUserId, creativeUserId)

    const approveResponse = await fetch(
      `${baseUrl}/api/versions/${upload.versionId}/status`,
      {
        method: "PATCH",
        headers: authHeaders(creativeCookies, creativeCsrf),
        body: JSON.stringify({ status: "approved" }),
      },
    )
    assert.equal(approveResponse.status, 200)

    const deleteProjectResponse = await fetch(`${baseUrl}/api/projects/${project.id}`, {
      method: "DELETE",
      headers: authHeaders(creativeCookies, creativeCsrf),
    })
    assert.equal(deleteProjectResponse.status, 403)
  })

  it("runs Proofing view/comment/annotate/compare/download workflow", async () => {
    const project = await createProject(adminCookies, adminCsrf, "Proofing Review Project")
    const deliverable = await createDeliverable(
      adminCookies,
      adminCsrf,
      project.id,
      "Review Cut",
    )
    const upload = await uploadVersion(
      adminCookies,
      adminCsrf,
      deliverable.id,
      "v1",
      "review.mp4",
      Buffer.alloc(96, 0x22),
    )

    const listVersionsResponse = await fetch(
      `${baseUrl}/api/deliverables/${deliverable.id}/versions`,
      { headers: authHeaders(proofingCookies, proofingCsrf, false) },
    )
    assert.equal(listVersionsResponse.status, 200)

    const annotation = {
      timestamp: 3,
      viewportWidth: 1920,
      viewportHeight: 1080,
      shapes: [
        {
          id: "shape-1",
          type: "arrow",
          color: "#f97316",
          strokeWidth: 0.004,
          points: [0.2, 0.3, 0.7, 0.6],
        },
      ],
    }

    const commentResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: authHeaders(proofingCookies, proofingCsrf),
      body: JSON.stringify({
        versionId: upload.versionId,
        timestamp: 3,
        body: "Please soften the edge here",
        annotation,
      }),
    })
    assert.equal(commentResponse.status, 201)
    const comment = (await commentResponse.json()) as {
      author: string
      authorUserId: string
      annotation?: { shapes: Array<{ type: string }> }
    }
    assert.equal(comment.author, proofingUserName)
    assert.ok(comment.authorUserId)
    assert.equal(comment.annotation?.shapes[0]?.type, "arrow")

    const downloadResponse = await fetch(
      `${baseUrl}/api/versions/${upload.versionId}/download`,
      { headers: authHeaders(proofingCookies, proofingCsrf, false) },
    )
    assert.equal(downloadResponse.status, 200)
  })

  it("denies Proofing media, version, structure, approval, and deletion mutations", async () => {
    const project = await createProject(adminCookies, adminCsrf, "Proofing Deny Project")
    const deliverable = await createDeliverable(
      adminCookies,
      adminCsrf,
      project.id,
      "Locked Cut",
    )
    const upload = await uploadVersion(
      adminCookies,
      adminCsrf,
      deliverable.id,
      "v1",
      "locked.mp4",
      Buffer.alloc(64, 0x33),
    )

    const uploadDenied = await fetch(
      `${baseUrl}/api/deliverables/${deliverable.id}/versions/v2/upload`,
      {
        method: "POST",
        headers: authHeaders(proofingCookies, proofingCsrf, false),
        body: new FormData(),
      },
    )
    assert.equal(uploadDenied.status, 403)

    const deliverableDenied = await fetch(
      `${baseUrl}/api/projects/${project.id}/deliverables`,
      {
        method: "POST",
        headers: authHeaders(proofingCookies, proofingCsrf),
        body: JSON.stringify({ name: "Proofing Deliverable" }),
      },
    )
    assert.equal(deliverableDenied.status, 403)

    const approveDenied = await fetch(`${baseUrl}/api/versions/${upload.versionId}/status`, {
      method: "PATCH",
      headers: authHeaders(proofingCookies, proofingCsrf),
      body: JSON.stringify({ status: "approved" }),
    })
    assert.equal(approveDenied.status, 403)

    const commentResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: authHeaders(adminCookies, adminCsrf),
      body: JSON.stringify({
        versionId: upload.versionId,
        timestamp: 1,
        body: "Needs another pass",
      }),
    })
    assert.equal(commentResponse.status, 201)
    const comment = (await commentResponse.json()) as { id: string }

    const resolveDenied = await fetch(
      `${baseUrl}/api/comments/${comment.id}/resolve`,
      {
        method: "PATCH",
        headers: authHeaders(proofingCookies, proofingCsrf),
        body: JSON.stringify({ resolved: true }),
      },
    )
    assert.equal(resolveDenied.status, 403)

    const deleteDenied = await fetch(`${baseUrl}/api/projects/${project.id}`, {
      method: "DELETE",
      headers: authHeaders(proofingCookies, proofingCsrf),
    })
    assert.equal(deleteDenied.status, 403)
  })

  it("denies cross-studio proofing reads and downloads", async () => {
    const projectDenied = await fetch(`${baseUrl}/api/projects/${otherProjectId}`, {
      headers: authHeaders(adminCookies, adminCsrf, false),
    })
    assert.equal(projectDenied.status, 404)

    const deliverableDenied = await fetch(
      `${baseUrl}/api/deliverables/${otherDeliverableId}`,
      { headers: authHeaders(creativeCookies, creativeCsrf, false) },
    )
    assert.equal(deliverableDenied.status, 404)

    const downloadDenied = await fetch(
      `${baseUrl}/api/versions/${otherVersionId}/download`,
      { headers: authHeaders(proofingCookies, proofingCsrf, false) },
    )
    assert.equal(downloadDenied.status, 404)

    const playbackDenied = await fetch(
      `${baseUrl}/video/${otherProjectId}/${otherDeliverableId}/v1/other.mp4`,
      { headers: { Cookie: cookieHeader(proofingCookies) } },
    )
    assert.equal(playbackDenied.status, 404)
  })

  it("removes stale files when re-uploading the same version label", async () => {
    const project = await createProject(adminCookies, adminCsrf, "Reupload Cleanup Project")
    const deliverable = await createDeliverable(
      adminCookies,
      adminCsrf,
      project.id,
      "Reupload Cut",
    )

    await uploadVersion(
      adminCookies,
      adminCsrf,
      deliverable.id,
      "v1",
      "first-cut.mp4",
      Buffer.alloc(32, 0x55),
    )

    const versionDir = path.join(uploadDir, project.id, deliverable.id, "v1")
    assert.ok(fs.existsSync(path.join(versionDir, "first-cut.mp4")))

    await uploadVersion(
      adminCookies,
      adminCsrf,
      deliverable.id,
      "v1",
      "second-cut.mp4",
      Buffer.alloc(32, 0x66),
    )

    assert.equal(fs.existsSync(path.join(versionDir, "first-cut.mp4")), false)
    assert.ok(fs.existsSync(path.join(versionDir, "second-cut.mp4")))
  })
})
