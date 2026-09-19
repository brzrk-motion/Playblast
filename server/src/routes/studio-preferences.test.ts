import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import type {
  AuthSuccessResponse,
  StudioPreferencesResponse,
} from "@playblast/shared"
import { createApp } from "../app.js"
import { __testOnly_resetRateLimits } from "../auth/rate-limit.js"
import { hashPasswordSync, normalizeEmail } from "../auth/password.js"
import { getDrizzle } from "../db/drizzle.js"
import { auditEvents, invitations, sessions, studios, users } from "../db/schema/identity.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

const ADMIN_PASSWORD = "correct horse battery 99"
const AE_PASSWORD = "account executive password 99"
const CREATIVE_PASSWORD = "creative password 99 ok"

let tempDir = ""
let uploadDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR
const previousSessionSecret = process.env.SESSION_SECRET
const previousNodeEnv = process.env.NODE_ENV

function collectSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }

  const single = response.headers.get("set-cookie")
  return single ? [single] : []
}

function cookieHeader(cookies: string[]): string {
  return cookies
    .map((entry) => entry.split(";")[0]!)
    .join("; ")
}

async function setupAdmin(): Promise<{
  session: AuthSuccessResponse
  cookies: string[]
  csrfToken: string
}> {
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

async function createUserWithRole(
  studioId: string,
  role: "account_executive" | "creative",
  email: string,
  password: string,
): Promise<void> {
  const db = getDrizzle()
  const now = new Date().toISOString()
  db.insert(users)
    .values({
      id: `${role}-user`,
      studioId,
      name: role === "account_executive" ? "AE User" : "Creative User",
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

function resetIdentityData(): void {
  const db = getDrizzle()
  db.delete(sessions).run()
  db.delete(invitations).run()
  db.delete(auditEvents).run()
  db.delete(users).run()
  db.delete(studios).run()
  fs.rmSync(uploadDir, { recursive: true, force: true })
  fs.mkdirSync(uploadDir, { recursive: true })
}

async function login(email: string, password: string): Promise<{
  cookies: string[]
  csrfToken: string
}> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  assert.equal(response.status, 200)
  const session = (await response.json()) as AuthSuccessResponse
  return {
    cookies: collectSetCookies(response),
    csrfToken: session.csrfToken,
  }
}

describe("Studio preferences API", () => {
  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-studio-prefs-"))
    uploadDir = path.join(tempDir, "uploads")
    dbPath = path.join(tempDir, "playblast.db")
    fs.mkdirSync(uploadDir, { recursive: true })

    process.env.DB_PATH = dbPath
    process.env.UPLOAD_DIR = uploadDir
    process.env.SESSION_SECRET = "test-session-secret"
    process.env.NODE_ENV = "development"

    initDatabase(dbPath)
    __testOnly_resetRateLimits()

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve())
    })

    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  beforeEach(() => {
    __testOnly_resetRateLimits()
    resetIdentityData()
  })

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    closeDatabase()

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

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("returns null defaults and persists studio-wide preferences", async () => {
    const { cookies, csrfToken } = await setupAdmin()

    const initial = await fetch(`${baseUrl}/api/studio/preferences`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(initial.status, 200)
    const initialBody = (await initial.json()) as StudioPreferencesResponse
    assert.deepEqual(initialBody, {
      internalHourlyCostRate: null,
      weeklyCapacityHours: null,
    })

    const patch = await fetch(`${baseUrl}/api/studio/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(cookies),
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        internalHourlyCostRate: 125.5,
        weeklyCapacityHours: 160,
      }),
    })
    assert.equal(patch.status, 200)
    const patchBody = (await patch.json()) as StudioPreferencesResponse
    assert.deepEqual(patchBody, {
      internalHourlyCostRate: 125.5,
      weeklyCapacityHours: 160,
    })

    const reread = await fetch(`${baseUrl}/api/studio/preferences`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(reread.status, 200)
    const rereadBody = (await reread.json()) as StudioPreferencesResponse
    assert.deepEqual(rereadBody, patchBody)
  })

  it("allows account executives to read and update preferences", async () => {
    const { session, cookies, csrfToken } = await setupAdmin()
    await createUserWithRole(
      session.studio.id,
      "account_executive",
      "ae@fixture.studio",
      AE_PASSWORD,
    )

    const aeSession = await login("ae@fixture.studio", AE_PASSWORD)

    const read = await fetch(`${baseUrl}/api/studio/preferences`, {
      headers: { Cookie: cookieHeader(aeSession.cookies) },
    })
    assert.equal(read.status, 200)

    const patch = await fetch(`${baseUrl}/api/studio/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(aeSession.cookies),
        "X-CSRF-Token": aeSession.csrfToken,
      },
      body: JSON.stringify({ weeklyCapacityHours: 120 }),
    })
    assert.equal(patch.status, 200)
    const patchBody = (await patch.json()) as StudioPreferencesResponse
    assert.equal(patchBody.weeklyCapacityHours, 120)

    const adminRead = await fetch(`${baseUrl}/api/studio/preferences`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    const adminBody = (await adminRead.json()) as StudioPreferencesResponse
    assert.equal(adminBody.weeklyCapacityHours, 120)
  })

  it("rejects creative users without business.manage", async () => {
    const { session } = await setupAdmin()
    await createUserWithRole(
      session.studio.id,
      "creative",
      "creative@fixture.studio",
      CREATIVE_PASSWORD,
    )

    const creativeSession = await login("creative@fixture.studio", CREATIVE_PASSWORD)

    const read = await fetch(`${baseUrl}/api/studio/preferences`, {
      headers: { Cookie: cookieHeader(creativeSession.cookies) },
    })
    assert.equal(read.status, 403)

    const patch = await fetch(`${baseUrl}/api/studio/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(creativeSession.cookies),
        "X-CSRF-Token": creativeSession.csrfToken,
      },
      body: JSON.stringify({ internalHourlyCostRate: 99 }),
    })
    assert.equal(patch.status, 403)
  })

  it("validates positive numbers and supports clearing values", async () => {
    const { cookies, csrfToken } = await setupAdmin()

    const invalid = await fetch(`${baseUrl}/api/studio/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(cookies),
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ internalHourlyCostRate: 0 }),
    })
    assert.equal(invalid.status, 400)

    await fetch(`${baseUrl}/api/studio/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(cookies),
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        internalHourlyCostRate: 90,
        weeklyCapacityHours: 40,
      }),
    })

    const cleared = await fetch(`${baseUrl}/api/studio/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(cookies),
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        internalHourlyCostRate: null,
        weeklyCapacityHours: null,
      }),
    })
    assert.equal(cleared.status, 200)
    const clearedBody = (await cleared.json()) as StudioPreferencesResponse
    assert.deepEqual(clearedBody, {
      internalHourlyCostRate: null,
      weeklyCapacityHours: null,
    })
  })
})
