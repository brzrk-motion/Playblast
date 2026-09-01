import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { after, before, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import type {
  AuthSuccessResponse,
  CurrentSessionResponse,
  StudioProfileResponse,
} from "@playblast/shared"
import { createApp } from "../app.js"
import { __testOnly_resetRateLimits } from "../auth/rate-limit.js"
import { hashPasswordSync } from "../auth/password.js"
import { normalizeEmail } from "../auth/password.js"
import { getDrizzle } from "../db/drizzle.js"
import { auditEvents, invitations, sessions, studios, users } from "../db/schema/identity.js"
import { __testOnly_getStudioById } from "../identity/repository.js"
import { resolveStoredAvatarPath } from "../config/paths.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

const ADMIN_PASSWORD = "correct horse battery 99"
const MEMBER_PASSWORD = "member password 99 ok"

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

let tempDir = ""
let uploadDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR
const previousSessionSecret = process.env.SESSION_SECRET
const previousNodeEnv = process.env.NODE_ENV

function parseSetCookie(header: string | null): string[] {
  if (!header) {
    return []
  }

  return Array.isArray(header) ? header : [header]
}

function getCookieValue(setCookies: string[], name: string): string | undefined {
  for (const cookie of setCookies) {
    const match = cookie.match(new RegExp(`(?:^|,)\\s*${name}=([^;]+)`))
    if (match?.[1]) {
      return decodeURIComponent(match[1])
    }
  }

  return undefined
}

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

async function loginAs(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  assert.equal(response.status, 200)
  const session = (await response.json()) as AuthSuccessResponse
  const cookies = collectSetCookies(response)
  return { session, cookies, csrfToken: session.csrfToken }
}

async function insertMemberUser(
  role: "creative" | "proofing",
  email: string,
  studioId: string,
) {
  const db = getDrizzle()
  const now = new Date().toISOString()
  const emailNormalized = normalizeEmail(email)

  db.insert(users)
    .values({
      id: randomUUID(),
      studioId,
      name: role === "creative" ? "Fixture Creative" : "Fixture Proofing",
      email,
      emailNormalized,
      passwordHash: hashPasswordSync(MEMBER_PASSWORD),
      role,
      disabled: false,
      createdAt: now,
      updatedAt: now,
    })
    .run()
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

async function configureStudio(
  cookies: string[],
  csrfToken: string,
  name = "Fixture Studio",
) {
  const patch = await fetch(`${baseUrl}/api/studio`, {
    method: "PATCH",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({ name }),
  })
  assert.equal(patch.status, 200)
  return (await patch.json()) as StudioProfileResponse
}

async function completeSetup(cookies: string[], csrfToken: string) {
  const response = await fetch(`${baseUrl}/api/setup/complete`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
  })
  assert.equal(response.status, 200)
  return (await response.json()) as StudioProfileResponse
}

async function uploadAvatar(cookies: string[], csrfToken: string) {
  const formData = new FormData()
  formData.append(
    "avatar",
    new Blob([PNG_1X1], { type: "image/png" }),
    "avatar.png",
  )

  const response = await fetch(`${baseUrl}/api/studio/avatar`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(cookies),
      "X-CSRF-Token": csrfToken,
    },
    body: formData,
  })

  return response
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-studio-phase3-"))
  dbPath = path.join(tempDir, "test.db")
  uploadDir = path.join(tempDir, "uploads")
  fs.mkdirSync(uploadDir, { recursive: true })

  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadDir
  process.env.NODE_ENV = "development"
  process.env.SESSION_SECRET = "phase-three-test-session-secret-value-32"

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

function resetIdentityData() {
  const db = getDrizzle()
  db.delete(sessions).run()
  db.delete(invitations).run()
  db.delete(auditEvents).run()
  db.delete(users).run()
  db.delete(studios).run()
  fs.rmSync(uploadDir, { recursive: true, force: true })
  fs.mkdirSync(uploadDir, { recursive: true })
}

beforeEach(() => {
  __testOnly_resetRateLimits()
  resetIdentityData()
})

after(async () => {
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

describe("Phase 3 studio profile and avatar", () => {
  it("lets admin update studio name, upload avatar, complete setup, and persist session metadata", async () => {
    const { session, cookies, csrfToken } = await setupAdmin()
    assert.equal(session.studio.setupStatus, "admin_created")
    assert.equal(session.studio.avatarUrl, null)

    const updated = await configureStudio(cookies, csrfToken, "BRZRK Motion")
    assert.equal(updated.name, "BRZRK Motion")
    assert.equal(updated.setupStatus, "studio_configured")

    const uploadResponse = await uploadAvatar(cookies, csrfToken)
    assert.equal(uploadResponse.status, 200)
    const uploaded = (await uploadResponse.json()) as StudioProfileResponse
    assert.equal(uploaded.avatarUrl, "/api/studio/avatar")

    const current = await fetch(`${baseUrl}/api/session`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(current.status, 200)
    const currentBody = (await current.json()) as CurrentSessionResponse
    assert.equal(currentBody.studio.name, "BRZRK Motion")
    assert.equal(currentBody.studio.avatarUrl, "/api/studio/avatar")

    const avatarResponse = await fetch(`${baseUrl}/api/studio/avatar`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(avatarResponse.status, 200)
    assert.equal(avatarResponse.headers.get("content-type"), "image/png")

    const completed = await completeSetup(cookies, csrfToken)
    assert.equal(completed.setupStatus, "complete")

    const setupStatus = await fetch(`${baseUrl}/api/setup/status`)
    const setupBody = (await setupStatus.json()) as { setupComplete: boolean }
    assert.equal(setupBody.setupComplete, true)
  })

  it("rejects invalid studio names and unsupported avatar uploads", async () => {
    const { cookies, csrfToken } = await setupAdmin()

    const invalidName = await fetch(`${baseUrl}/api/studio`, {
      method: "PATCH",
      headers: authHeaders(cookies, csrfToken),
      body: JSON.stringify({ name: " " }),
    })
    assert.equal(invalidName.status, 400)

    const invalidAvatar = await fetch(`${baseUrl}/api/studio/avatar`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader(cookies),
        "X-CSRF-Token": csrfToken,
      },
      body: (() => {
        const formData = new FormData()
        formData.append(
          "avatar",
          new Blob(["not-an-image"], { type: "image/png" }),
          "bad.png",
        )
        return formData
      })(),
    })
    assert.equal(invalidAvatar.status, 400)
  })

  it("denies creative and proofing users studio administration mutations", async () => {
    const { session, cookies, csrfToken } = await setupAdmin()
    await configureStudio(cookies, csrfToken)

    await insertMemberUser("creative", "creative@fixture.studio", session.studio.id)
    await insertMemberUser("proofing", "proofing@fixture.studio", session.studio.id)

    for (const email of ["creative@fixture.studio", "proofing@fixture.studio"]) {
      const member = await loginAs(email, MEMBER_PASSWORD)

      const readStudio = await fetch(`${baseUrl}/api/studio`, {
        headers: { Cookie: cookieHeader(member.cookies) },
      })
      assert.equal(readStudio.status, 200)

      const patchStudio = await fetch(`${baseUrl}/api/studio`, {
        method: "PATCH",
        headers: authHeaders(member.cookies, member.csrfToken),
        body: JSON.stringify({ name: "Blocked Rename" }),
      })
      assert.equal(patchStudio.status, 403)

      const uploadResponse = await uploadAvatar(member.cookies, member.csrfToken)
      assert.equal(uploadResponse.status, 403)

      const deleteAvatar = await fetch(`${baseUrl}/api/studio/avatar`, {
        method: "DELETE",
        headers: authHeaders(member.cookies, member.csrfToken, false),
      })
      assert.equal(deleteAvatar.status, 403)
    }
  })

  it("requires authentication for avatar reads and blocks stored path traversal", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await configureStudio(cookies, csrfToken)
    await uploadAvatar(cookies, csrfToken)

    const unauthenticated = await fetch(`${baseUrl}/api/studio/avatar`)
    assert.equal(unauthenticated.status, 401)

    assert.equal(resolveStoredAvatarPath("../../etc/passwd"), null)
    assert.equal(resolveStoredAvatarPath("avatars/../secrets.png"), null)
  })

  it("replaces and deletes avatars with filesystem cleanup", async () => {
    const { cookies, csrfToken, session } = await setupAdmin()
    await configureStudio(cookies, csrfToken)

    const firstUpload = await uploadAvatar(cookies, csrfToken)
    assert.equal(firstUpload.status, 200)
    const firstBody = (await firstUpload.json()) as StudioProfileResponse
    const studio = __testOnly_getStudioById(session.studio.id)
    const firstPath = studio?.avatarPath
    assert.ok(firstPath)

    const secondUpload = await uploadAvatar(cookies, csrfToken)
    assert.equal(secondUpload.status, 200)
    const secondBody = (await secondUpload.json()) as StudioProfileResponse
    const updatedStudio = __testOnly_getStudioById(session.studio.id)
    assert.notEqual(updatedStudio?.avatarPath, firstPath)
    assert.equal(firstBody.avatarUrl, secondBody.avatarUrl)
    const oldAbsolute = resolveStoredAvatarPath(firstPath!)
    assert.ok(!oldAbsolute || !fs.existsSync(oldAbsolute))

    const deleteResponse = await fetch(`${baseUrl}/api/studio/avatar`, {
      method: "DELETE",
      headers: authHeaders(cookies, csrfToken, false),
    })
    assert.equal(deleteResponse.status, 200)
    const deletedBody = (await deleteResponse.json()) as StudioProfileResponse
    assert.equal(deletedBody.avatarUrl, null)

    const refreshedStudio = __testOnly_getStudioById(session.studio.id)
    assert.equal(refreshedStudio?.avatarPath, null)
    const deletedAbsolute = updatedStudio?.avatarPath
      ? resolveStoredAvatarPath(updatedStudio.avatarPath)
      : null
    assert.ok(!deletedAbsolute || !fs.existsSync(deletedAbsolute))
  })

  it("preserves studio identity across a fresh session lookup after server restart", async () => {
    const { cookies, csrfToken } = await setupAdmin()
    await configureStudio(cookies, csrfToken, "Restart Studio")
    await uploadAvatar(cookies, csrfToken)
    await completeSetup(cookies, csrfToken)

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve())
    })
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("Failed to rebind test server")
    }
    baseUrl = `http://127.0.0.1:${address.port}`

    const current = await fetch(`${baseUrl}/api/session`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(current.status, 200)
    const currentBody = (await current.json()) as CurrentSessionResponse
    assert.equal(currentBody.studio.name, "Restart Studio")
    assert.equal(currentBody.studio.avatarUrl, "/api/studio/avatar")
    assert.equal(currentBody.user.role, "admin")
    assert.ok(!("password" in currentBody.user))
    assert.ok(!("csrfToken" in currentBody))
  })
})
