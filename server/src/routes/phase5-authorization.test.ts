import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { after, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { hasCapability, getCapabilitiesForRole } from "@playblast/shared"
import { createApp } from "../app.js"
import { hashPasswordSync, normalizeEmail } from "../auth/password.js"
import { getDrizzle } from "../db/drizzle.js"
import { studios, users } from "../db/schema/identity.js"
import { closeDatabase, getDb, initDatabase } from "../storage/db.js"
import {
  authHeaders,
  completeStudioSetup,
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
let creativeCookies: string[] = []
let creativeCsrf = ""
let proofingCookies: string[] = []
let proofingCsrf = ""

let primaryStudioId = ""
let otherStudioId = ""
let otherProjectId = ""

const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR
const previousSessionSecret = process.env.SESSION_SECRET
const previousNodeEnv = process.env.NODE_ENV

function insertRoleUser(
  studioId: string,
  role: "creative" | "proofing",
  email: string,
  password: string,
) {
  const db = getDrizzle()
  const now = new Date().toISOString()
  db.insert(users)
    .values({
      id: randomUUID(),
      studioId,
      name: role === "creative" ? "Fixture Creative" : "Fixture Proofing",
      email,
      emailNormalized: normalizeEmail(email),
      passwordHash: hashPasswordSync(password),
      role,
      disabled: false,
      createdAt: now,
      updatedAt: now,
    })
    .run()
}

async function createProjectAs(
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

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-phase5-"))
  dbPath = path.join(tempDir, "test.db")
  uploadDir = path.join(tempDir, "uploads")
  fs.mkdirSync(uploadDir, { recursive: true })

  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadDir
  process.env.SESSION_SECRET = "phase-five-test-secret-32chars-min"
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
  primaryStudioId = admin.session.studio.id

  await completeStudioSetup(baseUrl, adminCookies, adminCsrf)

  insertRoleUser(primaryStudioId, "creative", "creative@fixture.studio", CREATIVE_PASSWORD)
  insertRoleUser(primaryStudioId, "proofing", "proofing@fixture.studio", PROOFING_PASSWORD)

  const creative = await loginAccount(baseUrl, "creative@fixture.studio", CREATIVE_PASSWORD)
  creativeCookies = creative.cookies
  creativeCsrf = creative.csrfToken

  const proofing = await loginAccount(baseUrl, "proofing@fixture.studio", PROOFING_PASSWORD)
  proofingCookies = proofing.cookies
  proofingCsrf = proofing.csrfToken

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
  db.prepare(
    `INSERT INTO projects (id, name, createdAt, status, studioId)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(otherProjectId, "Other Studio Project", now, "active", otherStudioId)
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  if (previousDbPath === undefined) {
    delete process.env.DB_PATH
  } else {
    process.env.DB_PATH = previousDbPath
  }

  if (previousUploadDir === undefined) {
    delete process.env.UPLOAD_DIR
  } else {
    process.env.UPLOAD_DIR = previousUploadDir
  }

  if (previousSessionSecret === undefined) {
    delete process.env.SESSION_SECRET
  } else {
    process.env.SESSION_SECRET = previousSessionSecret
  }

  if (previousNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = previousNodeEnv
  }

  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("Phase 5 authorization", () => {
  it("denies unauthenticated project access", async () => {
    const response = await fetch(`${baseUrl}/api/projects`)
    assert.equal(response.status, 401)
  })

  it("scopes project lists to the authenticated studio", async () => {
    const project = await createProjectAs(adminCookies, adminCsrf, "Primary Studio Project")

    const response = await fetch(`${baseUrl}/api/projects`, {
      headers: authHeaders(adminCookies, adminCsrf, false),
    })
    assert.equal(response.status, 200)
    const projects = (await response.json()) as Array<{ id: string }>
    assert.ok(projects.some((entry) => entry.id === project.id))
    assert.ok(!projects.some((entry) => entry.id === otherProjectId))
  })

  it("returns not found for cross-studio project reads", async () => {
    const response = await fetch(`${baseUrl}/api/projects/${otherProjectId}`, {
      headers: authHeaders(adminCookies, adminCsrf, false),
    })
    assert.equal(response.status, 404)
  })

  it("proves Admin superset over Creative and Proofing capabilities", () => {
    for (const role of ["creative", "proofing"] as const) {
      for (const capability of getCapabilitiesForRole(role)) {
        assert.ok(
          hasCapability("admin", capability),
          `admin must include ${role} capability ${capability}`,
        )
      }
    }
  })

  it("denies Proofing project mutations", async () => {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: authHeaders(proofingCookies, proofingCsrf),
      body: JSON.stringify({ name: "Proofing Project" }),
    })
    assert.equal(response.status, 403)
  })

  it("allows Creative project mutations", async () => {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: authHeaders(creativeCookies, creativeCsrf),
      body: JSON.stringify({ name: "Creative Project" }),
    })
    assert.equal(response.status, 201)
  })

  it("denies Proofing destructive project operations", async () => {
    const project = await createProjectAs(creativeCookies, creativeCsrf, "Delete Deny Project")

    const archiveResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/archive`,
      {
        method: "POST",
        headers: authHeaders(proofingCookies, proofingCsrf),
      },
    )
    assert.equal(archiveResponse.status, 403)

    const deleteResponse = await fetch(`${baseUrl}/api/projects/${project.id}`, {
      method: "DELETE",
      headers: authHeaders(proofingCookies, proofingCsrf),
    })
    assert.equal(deleteResponse.status, 403)
  })

  it("denies Creative CRM routes", async () => {
    const response = await fetch(`${baseUrl}/api/clients`, {
      headers: authHeaders(creativeCookies, creativeCsrf, false),
    })
    assert.equal(response.status, 403)
  })

  it("allows Admin CRM routes", async () => {
    const response = await fetch(`${baseUrl}/api/clients`, {
      headers: authHeaders(adminCookies, adminCsrf, false),
    })
    assert.equal(response.status, 200)
  })
})
