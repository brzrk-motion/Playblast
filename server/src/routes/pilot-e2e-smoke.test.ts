import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

const SMOKE_AUTH_USER = "pilot-smoke"
const SMOKE_AUTH_PASSWORD = "smoke-test-password-not-for-production"

let tempDir = ""
let dbPath = ""
let uploadRoot = ""
let server: Server
let baseUrl = ""

const previousNodeEnv = process.env.NODE_ENV
const previousUser = process.env.PLAYBLAST_AUTH_USER
const previousPassword = process.env.PLAYBLAST_AUTH_PASSWORD
const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const credentials = Buffer.from(`${SMOKE_AUTH_USER}:${SMOKE_AUTH_PASSWORD}`).toString(
    "base64",
  )
  return { Authorization: `Basic ${credentials}`, ...extra }
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-pilot-e2e-"))
  dbPath = path.join(tempDir, "playblast.db")
  uploadRoot = path.join(tempDir, "uploads")

  process.env.NODE_ENV = "production"
  process.env.PLAYBLAST_AUTH_USER = SMOKE_AUTH_USER
  process.env.PLAYBLAST_AUTH_PASSWORD = SMOKE_AUTH_PASSWORD
  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadRoot
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
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv
  if (previousUser === undefined) delete process.env.PLAYBLAST_AUTH_USER
  else process.env.PLAYBLAST_AUTH_USER = previousUser
  if (previousPassword === undefined) delete process.env.PLAYBLAST_AUTH_PASSWORD
  else process.env.PLAYBLAST_AUTH_PASSWORD = previousPassword
  if (previousDbPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousDbPath
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR
  else process.env.UPLOAD_DIR = previousUploadDir
})

describe("pilot authenticated E2E smoke", () => {
  it("keeps health public and enforces Basic Auth on application routes", async () => {
    const health = await fetch(`${baseUrl}/health`)
    assert.equal(health.status, 200)
    const healthBody = (await health.json()) as { status: string }
    assert.equal(healthBody.status, "ok")

    const unauthenticated = await fetch(`${baseUrl}/api/projects`)
    assert.equal(unauthenticated.status, 401)
    assert.equal(
      unauthenticated.headers.get("www-authenticate"),
      'Basic realm="Playblast pilot"',
    )

    const authenticated = await fetch(`${baseUrl}/api/projects`, {
      headers: authHeaders(),
    })
    assert.equal(authenticated.status, 200)
  })

  it("covers project → deliverable → upload → playback → download → comment → approval", async () => {
    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id: "pilot-smoke",
        name: "Pilot Smoke Spot",
        status: "active",
      }),
    })
    assert.equal(projectResponse.status, 201)
    const project = (await projectResponse.json()) as { id: string; name: string }
    assert.equal(project.id, "pilot-smoke")

    const deliverableResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/deliverables`,
      {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: "Hero Cut" }),
      },
    )
    assert.equal(deliverableResponse.status, 201)
    const deliverable = (await deliverableResponse.json()) as {
      id: string
      name: string
      status: string
    }
    assert.equal(deliverable.name, "Hero Cut")
    assert.equal(deliverable.status, "not_started")

    const versionLabel = "v1"
    const videoFilename = "pilot-smoke.mp4"
    const videoBytes = Buffer.alloc(512, 0x42)
    const formData = new FormData()
    formData.append(
      "video",
      new Blob([videoBytes], { type: "video/mp4" }),
      videoFilename,
    )

    const uploadResponse = await fetch(
      `${baseUrl}/api/deliverables/${deliverable.id}/versions/${versionLabel}/upload`,
      {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      },
    )
    assert.equal(uploadResponse.status, 201)
    const upload = (await uploadResponse.json()) as {
      versionId: string
      filename: string
      size: number
    }
    assert.equal(upload.filename, videoFilename)
    assert.equal(upload.size, videoBytes.length)
    assert.ok(upload.versionId)

    const playbackResponse = await fetch(
      `${baseUrl}/video/${project.id}/${deliverable.id}/${versionLabel}/${videoFilename}`,
      { headers: authHeaders({ Range: "bytes=0-15" }) },
    )
    assert.equal(playbackResponse.status, 206)
    assert.equal(playbackResponse.headers.get("content-type"), "video/mp4")
    const playbackBody = Buffer.from(await playbackResponse.arrayBuffer())
    assert.equal(playbackBody.length, 16)
    assert.equal(playbackBody[0], 0x42)

    const downloadResponse = await fetch(
      `${baseUrl}/api/versions/${upload.versionId}/download`,
      { headers: authHeaders() },
    )
    assert.equal(downloadResponse.status, 200)
    assert.equal(downloadResponse.headers.get("content-type"), "video/mp4")
    assert.match(
      downloadResponse.headers.get("content-disposition") ?? "",
      /attachment/i,
    )
    const downloadBody = Buffer.from(await downloadResponse.arrayBuffer())
    assert.equal(downloadBody.length, videoBytes.length)

    const annotation = {
      timestamp: 2.5,
      viewportWidth: 1920,
      viewportHeight: 1080,
      shapes: [
        {
          id: "shape-smoke-1",
          type: "arrow",
          color: "#f97316",
          strokeWidth: 0.004,
          points: [0.2, 0.3, 0.7, 0.6],
        },
      ],
    }

    const commentResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        versionId: upload.versionId,
        timestamp: 2.5,
        body: "Soften the highlight on the logo lockup",
        author: "Reviewer",
        annotation,
      }),
    })
    assert.equal(commentResponse.status, 201)
    const comment = (await commentResponse.json()) as {
      id: string
      resolved: boolean
      annotation?: { shapes: Array<{ type: string }> }
    }
    assert.equal(comment.resolved, false)
    assert.equal(comment.annotation?.shapes[0]?.type, "arrow")

    const commentsListResponse = await fetch(
      `${baseUrl}/api/comments?versionId=${encodeURIComponent(upload.versionId)}`,
      { headers: authHeaders() },
    )
    assert.equal(commentsListResponse.status, 200)
    const comments = (await commentsListResponse.json()) as Array<{ id: string }>
    assert.equal(comments.length, 1)
    assert.equal(comments[0]?.id, comment.id)

    const approveResponse = await fetch(
      `${baseUrl}/api/versions/${upload.versionId}/status`,
      {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "approved" }),
      },
    )
    assert.equal(approveResponse.status, 200)
    const approvedVersion = (await approveResponse.json()) as { status: string }
    assert.equal(approvedVersion.status, "approved")

    const projectsListResponse = await fetch(`${baseUrl}/api/projects`, {
      headers: authHeaders(),
    })
    assert.equal(projectsListResponse.status, 200)
    const projects = (await projectsListResponse.json()) as Array<{
      id: string
      openCommentCount: number
      versionCount: number
    }>
    const projectSummary = projects.find((item) => item.id === project.id)
    assert.ok(projectSummary)
    assert.equal(projectSummary.openCommentCount, 1)
    assert.equal(projectSummary.versionCount, 1)

    const deliverablesResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/deliverables`,
      { headers: authHeaders() },
    )
    assert.equal(deliverablesResponse.status, 200)
    const deliverables = (await deliverablesResponse.json()) as Array<{
      id: string
      openCommentCount: number
      latestVersionStatus: string | null
    }>
    const deliverableSummary = deliverables.find((item) => item.id === deliverable.id)
    assert.ok(deliverableSummary)
    assert.equal(deliverableSummary.openCommentCount, 1)
    assert.equal(deliverableSummary.latestVersionStatus, "approved")

    const versionsResponse = await fetch(
      `${baseUrl}/api/deliverables/${deliverable.id}/versions`,
      { headers: authHeaders() },
    )
    assert.equal(versionsResponse.status, 200)
    const versions = (await versionsResponse.json()) as Array<{
      id: string
      status: string
      label: string
    }>
    assert.equal(versions.length, 1)
    assert.equal(versions[0]?.id, upload.versionId)
    assert.equal(versions[0]?.status, "approved")
    assert.equal(versions[0]?.label, versionLabel)
  })
})
