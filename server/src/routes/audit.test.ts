import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { after, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import type { ListAuditEventsResponse, UserRole } from "@playblast/shared"
import { AUDIT_EVENT_TYPES } from "@playblast/shared"
import { createApp } from "../app.js"
import { recordAuditEvent } from "../auth/audit.js"
import { hashPasswordSync, normalizeEmail } from "../auth/password.js"
import { getDrizzle } from "../db/drizzle.js"
import { auditEvents, studios, users } from "../db/schema/identity.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import {
  authHeaders,
  completeStudioSetup,
  loginAccount,
  setupAdminAccount,
} from "../test/auth-helpers.js"

const ADMIN_PASSWORD = "correct horse battery 99"
const CREATIVE_PASSWORD = "creative password 99 ok"

let tempDir = ""
let uploadDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""
let adminCookies: string[] = []
let adminCsrf = ""
let adminUserId = ""
let creativeCookies: string[] = []
let creativeCsrf = ""
let studioId = ""

const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR
const previousSessionSecret = process.env.SESSION_SECRET
const previousNodeEnv = process.env.NODE_ENV

function insertRoleUser(
  targetStudioId: string,
  role: Exclude<UserRole, "admin">,
  email: string,
  password: string,
) {
  const db = getDrizzle()
  const now = new Date().toISOString()
  db.insert(users)
    .values({
      id: randomUUID(),
      studioId: targetStudioId,
      name: role === "creative" ? "Fixture Creative" : "Fixture User",
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

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-audit-test-"))
  uploadDir = path.join(tempDir, "uploads")
  dbPath = path.join(tempDir, "playblast.db")
  fs.mkdirSync(uploadDir, { recursive: true })

  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadDir
  process.env.SESSION_SECRET = "audit-test-session-secret-32chars"
  process.env.NODE_ENV = "development"

  initDatabase(dbPath)

  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind audit test server")
  }
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
  process.env.DB_PATH = previousDbPath
  process.env.UPLOAD_DIR = previousUploadDir
  process.env.SESSION_SECRET = previousSessionSecret
  process.env.NODE_ENV = previousNodeEnv
})

beforeEach(async () => {
  const db = getDrizzle()
  db.delete(auditEvents).run()
  db.delete(users).run()
  db.delete(studios).run()

  const admin = await setupAdminAccount(baseUrl)
  adminCookies = admin.cookies
  adminCsrf = admin.csrfToken
  studioId = admin.session.studio.id
  adminUserId = admin.session.user.id

  await completeStudioSetup(baseUrl, adminCookies, adminCsrf)

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.loginFailed,
    studioId,
    metadata: { email: "wrong@fixture.studio" },
  })
  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.inviteCreated,
    studioId,
    userId: adminUserId,
    metadata: {
      invitationId: "invite-1",
      email: "creative@fixture.studio",
      role: "creative",
    },
  })

  insertRoleUser(studioId, "creative", "creative@fixture.studio", CREATIVE_PASSWORD)
  const creative = await loginAccount(baseUrl, "creative@fixture.studio", CREATIVE_PASSWORD)
  creativeCookies = creative.cookies
  creativeCsrf = creative.csrfToken
})

describe("audit routes", () => {
  it("lists audit events for admin with newest first", async () => {
    const response = await fetch(`${baseUrl}/api/audit-events?limit=10`, {
      headers: authHeaders(adminCookies, adminCsrf),
    })
    assert.equal(response.status, 200)

    const body = (await response.json()) as ListAuditEventsResponse
    assert.ok(body.total >= 2)
    assert.equal(body.events.length, body.total)

    const inviteEvent = body.events.find(
      (event) => event.eventType === AUDIT_EVENT_TYPES.inviteCreated,
    )
    const failedLoginEvent = body.events.find(
      (event) => event.eventType === AUDIT_EVENT_TYPES.loginFailed,
    )

    assert.equal(inviteEvent?.actorName, "Fixture Admin")
    assert.equal(failedLoginEvent?.metadata?.email, "wrong@fixture.studio")
  })

  it("filters audit events by event type", async () => {
    const response = await fetch(
      `${baseUrl}/api/audit-events?eventType=${AUDIT_EVENT_TYPES.loginFailed}`,
      { headers: authHeaders(adminCookies, adminCsrf) },
    )
    assert.equal(response.status, 200)

    const body = (await response.json()) as ListAuditEventsResponse
    assert.ok(body.events.every((event) => event.eventType === AUDIT_EVENT_TYPES.loginFailed))
  })

  it("rejects invalid event type filters", async () => {
    const response = await fetch(`${baseUrl}/api/audit-events?eventType=not.real`, {
      headers: authHeaders(adminCookies, adminCsrf),
    })
    assert.equal(response.status, 400)
  })

  it("denies non-admin access to audit events", async () => {
    const response = await fetch(`${baseUrl}/api/audit-events`, {
      headers: authHeaders(creativeCookies, creativeCsrf),
    })
    assert.equal(response.status, 403)
  })

  it("exports audit events as CSV for admin", async () => {
    const response = await fetch(`${baseUrl}/api/audit-events/export`, {
      headers: authHeaders(adminCookies, adminCsrf, false),
    })
    assert.equal(response.status, 200)
    assert.match(response.headers.get("content-type") ?? "", /text\/csv/)
    assert.match(response.headers.get("content-disposition") ?? "", /attachment/)

    const csv = await response.text()
    assert.match(csv, /^id,created_at,event_type,event_label,actor_name,actor_email,metadata/)
    assert.match(csv, /auth\.login_failed/)
    assert.match(csv, /team\.invite_created/)
  })
})
