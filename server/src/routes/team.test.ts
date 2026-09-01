import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { after, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import type {
  AuthSuccessResponse,
  InvitationSummary,
  SmtpSettingsResponse,
  UserSummary,
} from "@playblast/shared"
import { eq } from "drizzle-orm"
import { createApp } from "../app.js"
import { __testOnly_resetRateLimits } from "../auth/rate-limit.js"
import { hashPasswordSync, normalizeEmail } from "../auth/password.js"
import { countSessionsForUser } from "../auth/session.js"
import { getDrizzle } from "../db/drizzle.js"
import {
  auditEvents,
  invitations,
  sessions,
  studioSmtpSettings,
  studios,
  users,
} from "../db/schema/identity.js"
import {
  setSmtpTransport,
  type OutboundEmail,
  type SmtpTransport,
} from "../identity/smtp-transport.js"
import { __testOnly_getInvitationByEmail } from "../identity/team-service.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

const ADMIN_PASSWORD = "correct horse battery 99"
const MEMBER_PASSWORD = "member password 99 ok"
const INVITE_PASSWORD = "invite password 99 ok"

let tempDir = ""
let uploadDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""
let capturedEmails: OutboundEmail[] = []
let smtpShouldFail = false
let smtpHostUsed: string | null = null

const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR
const previousSessionSecret = process.env.SESSION_SECRET
const previousNodeEnv = process.env.NODE_ENV

const mockTransport: SmtpTransport = {
  async send(config, message) {
    smtpHostUsed = config.host
    if (smtpShouldFail) {
      return { accepted: false, errorMessage: "Mock SMTP failure" }
    }
    capturedEmails.push(message)
    return { accepted: true }
  },
}

function collectSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }
  const single = response.headers.get("set-cookie")
  return single ? [single] : []
}

function cookieHeader(cookies: string[]): string {
  return cookies.map((entry) => entry.split(";")[0]!).join("; ")
}

function authHeaders(cookies: string[], csrfToken: string, json = true): HeadersInit {
  const headers: Record<string, string> = {
    Cookie: cookieHeader(cookies),
    "X-CSRF-Token": csrfToken,
  }
  if (json) {
    headers["Content-Type"] = "application/json"
  }
  return headers
}

async function setupAdmin() {
  const response = await fetch(`${baseUrl}/api/setup/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Fixture Admin",
      email: "admin@fixture.studio",
      password: ADMIN_PASSWORD,
      confirmPassword: ADMIN_PASSWORD,
    }),
  })
  assert.equal(response.status, 201)
  const session = (await response.json()) as AuthSuccessResponse
  const cookies = collectSetCookies(response)
  return { session, cookies, csrfToken: session.csrfToken }
}

async function loginAs(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(response.status, 200)
  const session = (await response.json()) as AuthSuccessResponse
  return { session, cookies: collectSetCookies(response), csrfToken: session.csrfToken }
}

async function completeStudioSetupFlow(cookies: string[], csrfToken: string) {
  await fetch(`${baseUrl}/api/studio`, {
    method: "PATCH",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({ name: "Fixture Studio" }),
  })

  await fetch(`${baseUrl}/api/setup/complete`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
  })
}

async function configureSmtp(cookies: string[], csrfToken: string) {
  const response = await fetch(`${baseUrl}/api/smtp`, {
    method: "PUT",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({
      host: "smtp.fixture.local",
      port: 587,
      username: "smtp-user",
      password: "smtp-secret-password",
      fromEmail: "noreply@fixture.studio",
      tlsMode: "starttls",
      instanceUrl: baseUrl,
    }),
  })
  assert.equal(response.status, 200)
  return (await response.json()) as SmtpSettingsResponse
}

async function verifySmtp(cookies: string[], csrfToken: string) {
  const response = await fetch(`${baseUrl}/api/smtp/test`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({}),
  })
  assert.equal(response.status, 200)
}

async function insertMemberUser(
  role: "creative" | "proofing",
  email: string,
  studioId: string,
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
      passwordHash: hashPasswordSync(MEMBER_PASSWORD),
      role,
      disabled: false,
      createdAt: now,
      updatedAt: now,
    })
    .run()
}

function resetIdentityData() {
  const db = getDrizzle()
  db.delete(sessions).run()
  db.delete(invitations).run()
  db.delete(studioSmtpSettings).run()
  db.delete(auditEvents).run()
  db.delete(users).run()
  db.delete(studios).run()
  fs.rmSync(uploadDir, { recursive: true, force: true })
  fs.mkdirSync(uploadDir, { recursive: true })
  capturedEmails = []
  smtpShouldFail = false
  smtpHostUsed = null
}

function extractInviteTokenFromEmail(): string {
  const email = capturedEmails.at(-1)
  assert.ok(email)
  const match = email.text.match(/\/invite\/([A-Za-z0-9_-]+)/)
  assert.ok(match?.[1], "invite token missing from email")
  return match[1]
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-team-phase4-"))
  dbPath = path.join(tempDir, "test.db")
  uploadDir = path.join(tempDir, "uploads")
  fs.mkdirSync(uploadDir, { recursive: true })

  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadDir
  process.env.NODE_ENV = "development"
  process.env.SESSION_SECRET = "phase-four-test-session-secret-value-32"

  initDatabase(dbPath)
  setSmtpTransport(mockTransport)

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

beforeEach(() => {
  __testOnly_resetRateLimits()
  resetIdentityData()
})

after(async () => {
  setSmtpTransport(null)
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  if (previousDbPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousDbPath
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR
  else process.env.UPLOAD_DIR = previousUploadDir
  if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = previousSessionSecret
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv

  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("Phase 4 team, SMTP, and invitations", () => {
  it("denies creative and proofing users from team and SMTP routes", async () => {
    const { session, cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)
    await configureSmtp(cookies, csrfToken)
    await verifySmtp(cookies, csrfToken)

    await insertMemberUser("creative", "creative@fixture.studio", session.studio.id)
    await insertMemberUser("proofing", "proofing@fixture.studio", session.studio.id)

    const protectedRoutes = [
      { method: "GET", path: "/api/users" },
      { method: "GET", path: "/api/invitations" },
      { method: "GET", path: "/api/smtp" },
      { method: "PUT", path: "/api/smtp", body: {} },
      { method: "POST", path: "/api/smtp/test", body: {} },
      { method: "POST", path: "/api/invitations", body: {} },
    ] as const

    for (const email of ["creative@fixture.studio", "proofing@fixture.studio"]) {
      const member = await loginAs(email, MEMBER_PASSWORD)
      for (const route of protectedRoutes) {
        const response = await fetch(`${baseUrl}${route.path}`, {
          method: route.method,
          headers: authHeaders(member.cookies, member.csrfToken),
          body: "body" in route ? JSON.stringify(route.body) : undefined,
        })
        assert.equal(response.status, 403, `${email} should not access ${route.method} ${route.path}`)
      }
    }
  })

  it("masks SMTP secrets and records accurate test status", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)

    const saved = await configureSmtp(cookies, csrfToken)
    assert.equal(saved.passwordConfigured, true)
    assert.ok(!("password" in saved))

    const read = await fetch(`${baseUrl}/api/smtp`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    const body = (await read.json()) as SmtpSettingsResponse & { password?: string }
    assert.equal(read.status, 200)
    assert.equal(body.passwordConfigured, true)
    assert.equal(body.testVerified, false)
    assert.equal(body.password, undefined)

    await verifySmtp(cookies, csrfToken)
    const verified = await fetch(`${baseUrl}/api/smtp`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    const verifiedBody = (await verified.json()) as SmtpSettingsResponse
    assert.equal(verifiedBody.testVerified, true)
    assert.equal(verifiedBody.lastTestStatus, "success")
    assert.equal(smtpHostUsed, "smtp.fixture.local")
    assert.ok(!smtpHostUsed?.includes("brzrk"))
  })

  it("reports SMTP test failure without echoing credentials", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)
    await configureSmtp(cookies, csrfToken)

    smtpShouldFail = true
    const response = await fetch(`${baseUrl}/api/smtp/test`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({}),
    })
    const body = (await response.json()) as { code: string; error: string }
    assert.equal(response.status, 502)
    assert.equal(body.code, "DELIVERY_FAILED")
    assert.ok(!body.error.includes("smtp-secret-password"))

    const settings = await fetch(`${baseUrl}/api/smtp`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    const settingsBody = (await settings.json()) as SmtpSettingsResponse
    assert.equal(settingsBody.lastTestStatus, "failed")
    assert.equal(settingsBody.testVerified, false)
  })

  it("invites creative and proofing users with role-locked acceptance", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)
    await configureSmtp(cookies, csrfToken)
    await verifySmtp(cookies, csrfToken)

    for (const role of ["creative", "proofing"] as const) {
      capturedEmails = []
      const email = `${role}@fixture.studio`
      const create = await fetch(`${baseUrl}/api/invitations`, {
        method: "POST",
        headers: authHeaders(cookies, csrfToken),
        body: JSON.stringify({
          name: `Fixture ${role}`,
          email,
          role,
        }),
      })
      assert.equal(create.status, 201)

      const emailBody = capturedEmails[0]!
      assert.ok(emailBody.text.includes(role === "creative" ? "Creative" : "Proofing"))
      assert.ok(emailBody.text.includes("self-hosted Playblast"))
      assert.ok(!emailBody.text.includes("brzrk"))

      const token = extractInviteTokenFromEmail()
      const preview = await fetch(`${baseUrl}/api/invites/${token}`)
      const previewBody = (await preview.json()) as { role: string; studioName: string }
      assert.equal(preview.status, 200)
      assert.equal(previewBody.role, role)
      assert.equal(previewBody.studioName, "Fixture Studio")

      const accept = await fetch(`${baseUrl}/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: INVITE_PASSWORD,
          confirmPassword: INVITE_PASSWORD,
        }),
      })
      assert.equal(accept.status, 200)
      const accepted = (await accept.json()) as AuthSuccessResponse
      assert.equal(accepted.user.role, role)

      const replay = await fetch(`${baseUrl}/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: INVITE_PASSWORD,
          confirmPassword: INVITE_PASSWORD,
        }),
      })
      const replayBody = (await replay.json()) as { code: string }
      assert.equal(replay.status, 409)
      assert.equal(replayBody.code, "INVITE_ALREADY_USED")

      const login = await loginAs(email, INVITE_PASSWORD)
      assert.equal(login.session.user.role, role)
    }
  })

  it("handles revoke, resend, expiry, and delivery failure consistently", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)
    await configureSmtp(cookies, csrfToken)
    await verifySmtp(cookies, csrfToken)

    const create = await fetch(`${baseUrl}/api/invitations`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({
        name: "Pending User",
        email: "pending@fixture.studio",
        role: "creative",
      }),
    })
    assert.equal(create.status, 201)
    const created = (await create.json()) as InvitationSummary
    const oldToken = extractInviteTokenFromEmail()

    capturedEmails = []
    const resend = await fetch(`${baseUrl}/api/invitations/${created.id}/resend`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
    })
    assert.equal(resend.status, 200)
    const newToken = extractInviteTokenFromEmail()
    assert.notEqual(oldToken, newToken)

    const replayOld = await fetch(`${baseUrl}/api/invites/${oldToken}`)
    assert.equal(replayOld.status, 400)

    const revoke = await fetch(`${baseUrl}/api/invitations/${created.id}/revoke`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
    })
    assert.equal(revoke.status, 200)

    const revokedPreview = await fetch(`${baseUrl}/api/invites/${newToken}`)
    const revokedBody = (await revokedPreview.json()) as { code: string }
    assert.equal(revokedPreview.status, 410)
    assert.equal(revokedBody.code, "INVITE_REVOKED")

    const createExpired = await fetch(`${baseUrl}/api/invitations`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({
        name: "Expired User",
        email: "expired@fixture.studio",
        role: "proofing",
      }),
    })
    assert.equal(createExpired.status, 201)
    const expiredToken = extractInviteTokenFromEmail()
    const db = getDrizzle()
    const expiredInvite = __testOnly_getInvitationByEmail("expired@fixture.studio")
    assert.ok(expiredInvite)
    db.update(invitations)
      .set({
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        status: "pending",
      })
      .where(eq(invitations.id, expiredInvite.id))
      .run()

    const expiredPreview = await fetch(`${baseUrl}/api/invites/${expiredToken}`)
    const expiredBody = (await expiredPreview.json()) as { code: string }
    assert.equal(expiredPreview.status, 410)
    assert.equal(expiredBody.code, "INVITE_EXPIRED")

    smtpShouldFail = true
    const failInvite = await fetch(`${baseUrl}/api/invitations`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({
        name: "Fail User",
        email: "fail@fixture.studio",
        role: "proofing",
      }),
    })
    const failBody = (await failInvite.json()) as { code: string }
    assert.equal(failInvite.status, 502)
    assert.equal(failBody.code, "DELIVERY_FAILED")

    const listed = await fetch(`${baseUrl}/api/invitations`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    const invites = (await listed.json()) as InvitationSummary[]
    const failed = invites.find((entry) => entry.email === "fail@fixture.studio")
    assert.equal(failed?.status, "delivery_failed")
  })

  it("protects the last active admin and revokes sessions on disable or demotion", async () => {
    const { session, cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)

    assert.ok(countSessionsForUser(session.user.id) >= 1)

    const disableSelf = await fetch(`${baseUrl}/api/users/${session.user.id}`, {
      method: "PATCH",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({ disabled: true }),
    })
    const disableSelfBody = (await disableSelf.json()) as { code: string }
    assert.equal(disableSelf.status, 403)
    assert.equal(disableSelfBody.code, "FORBIDDEN")

    await insertMemberUser("creative", "creative@fixture.studio", session.studio.id)
    const creative = await loginAs("creative@fixture.studio", MEMBER_PASSWORD)
    assert.ok(countSessionsForUser(creative.session.user.id) >= 1)

    const demoteAdmin = await fetch(`${baseUrl}/api/users/${session.user.id}`, {
      method: "PATCH",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({ role: "creative" }),
    })
    const demoteBody = (await demoteAdmin.json()) as { code: string }
    assert.equal(demoteAdmin.status, 409)
    assert.equal(demoteBody.code, "CONFLICT")

    const disableCreative = await fetch(`${baseUrl}/api/users/${creative.session.user.id}`, {
      method: "PATCH",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({ disabled: true }),
    })
    assert.equal(disableCreative.status, 200)
    assert.equal(countSessionsForUser(creative.session.user.id), 0)

    const reactivate = await fetch(`${baseUrl}/api/users/${creative.session.user.id}`, {
      method: "PATCH",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({ disabled: false }),
    })
    assert.equal(reactivate.status, 200)

    const demoteCreative = await fetch(`${baseUrl}/api/users/${creative.session.user.id}`, {
      method: "PATCH",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({ role: "proofing" }),
    })
    assert.equal(demoteCreative.status, 200)
    assert.equal(countSessionsForUser(creative.session.user.id), 0)
  })

  it("blocks invitations until SMTP is verified", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)
    await configureSmtp(cookies, csrfToken)

    const response = await fetch(`${baseUrl}/api/invitations`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({
        name: "Blocked User",
        email: "blocked@fixture.studio",
        role: "creative",
      }),
    })
    const body = (await response.json()) as { code: string }
    assert.equal(response.status, 400)
    assert.equal(body.code, "VALIDATION_FAILED")
  })

  it("rejects admin role in invitation payloads", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)
    await configureSmtp(cookies, csrfToken)
    await verifySmtp(cookies, csrfToken)

    const response = await fetch(`${baseUrl}/api/invitations`, {
      method: "POST",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({
        name: "Bad Role",
        email: "badrole@fixture.studio",
        role: "admin",
      }),
    })
    const body = (await response.json()) as { code: string }
    assert.equal(response.status, 400)
    assert.equal(body.code, "VALIDATION_FAILED")
  })

  it("lists users for admin after setup", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await completeStudioSetupFlow(cookies, csrfToken)

    const response = await fetch(`${baseUrl}/api/users`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(response.status, 200)
    const listed = (await response.json()) as UserSummary[]
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.role, "admin")
  })
})
