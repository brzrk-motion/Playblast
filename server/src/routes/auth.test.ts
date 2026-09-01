import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import type { AuthSuccessResponse, CurrentSessionResponse } from "@playblast/shared"
import { createApp } from "../app.js"
import { __testOnly_resetRateLimits } from "../auth/rate-limit.js"
import { getAuditEventCount } from "../identity/repository.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

const ADMIN_PASSWORD = "correct horse battery 99"
const RECOVERY_TOKEN = "deployment-recovery-token-value"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

const previousSessionSecret = process.env.SESSION_SECRET
const previousRecoveryToken = process.env.PLAYBLAST_ADMIN_RECOVERY_TOKEN
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

async function setupAdmin(email = "admin@fixture.studio"): Promise<{
  session: AuthSuccessResponse
  cookies: string[]
  csrfToken: string
}> {
  const response = await fetch(`${baseUrl}/api/setup/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Fixture Admin",
      email,
      password: ADMIN_PASSWORD,
      confirmPassword: ADMIN_PASSWORD,
    }),
  })

  assert.equal(response.status, 201)
  const session = (await response.json()) as AuthSuccessResponse
  const cookies = collectSetCookies(response)
  const csrfToken = session.csrfToken
  return { session, cookies, csrfToken }
}

function cookieHeader(cookies: string[]): string {
  return cookies
    .map((entry) => entry.split(";")[0]!)
    .join("; ")
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-auth-phase2-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  process.env.NODE_ENV = "development"
  process.env.SESSION_SECRET = "phase-two-test-session-secret-value-32chars"
  process.env.PLAYBLAST_ADMIN_RECOVERY_TOKEN = RECOVERY_TOKEN
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
  if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = previousSessionSecret
  if (previousRecoveryToken === undefined) delete process.env.PLAYBLAST_ADMIN_RECOVERY_TOKEN
  else process.env.PLAYBLAST_ADMIN_RECOVERY_TOKEN = previousRecoveryToken
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv

  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("Phase 2 authentication lifecycle", () => {
  it("creates the bootstrap admin and session on a fresh database", async () => {
    __testOnly_resetRateLimits()
    const { session, cookies } = await setupAdmin()

    assert.equal(session.user.role, "admin")
    assert.equal(session.user.email, "admin@fixture.studio")
    assert.equal(session.studio.setupStatus, "admin_created")
    assert.ok(session.csrfToken)

    const sessionCookie = getCookieValue(cookies, "playblast_session")
    const csrfCookie = getCookieValue(cookies, "playblast_csrf")
    assert.ok(sessionCookie)
    assert.ok(csrfCookie)
    assert.match(cookies.join(" "), /HttpOnly/i)
    assert.match(cookies.join(" "), /SameSite=Strict/i)

    const current = await fetch(`${baseUrl}/api/session`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(current.status, 200)
    const currentBody = (await current.json()) as CurrentSessionResponse
    assert.equal(currentBody.user.id, session.user.id)
  })

  it("rejects repeated setup after bootstrap admin exists", async () => {
    __testOnly_resetRateLimits()
    const response = await fetch(`${baseUrl}/api/setup/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Second Admin",
        email: "second@fixture.studio",
        password: ADMIN_PASSWORD,
        confirmPassword: ADMIN_PASSWORD,
      }),
    })

    assert.equal(response.status, 409)
    const body = (await response.json()) as { code: string }
    assert.equal(body.code, "SETUP_ALREADY_COMPLETE")
  })

  it("logs in and out with generic failures for wrong credentials", async () => {
    __testOnly_resetRateLimits()

    const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@fixture.studio",
        password: "wrong-password-value",
      }),
    })
    assert.equal(badLogin.status, 401)
    const badBody = (await badLogin.json()) as { code: string; error: string }
    assert.equal(badBody.code, "UNAUTHENTICATED")
    assert.equal(badBody.error, "Invalid email or password.")

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@fixture.studio",
        password: ADMIN_PASSWORD,
      }),
    })
    assert.equal(loginResponse.status, 200)
    const loginBody = (await loginResponse.json()) as AuthSuccessResponse
    const cookies = collectSetCookies(loginResponse)

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader(cookies),
        "X-CSRF-Token": loginBody.csrfToken,
      },
    })
    assert.equal(logoutResponse.status, 204)

    const afterLogout = await fetch(`${baseUrl}/api/session`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(afterLogout.status, 401)
    const afterLogoutBody = (await afterLogout.json()) as { code: string }
    assert.equal(afterLogoutBody.code, "SESSION_EXPIRED")
  })

  it("rejects replayed sessions and enforces CSRF on authenticated mutations", async () => {
    __testOnly_resetRateLimits()
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@fixture.studio",
        password: ADMIN_PASSWORD,
      }),
    })
    const loginBody = (await loginResponse.json()) as AuthSuccessResponse
    const cookies = collectSetCookies(loginResponse)

    const missingCsrf = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(missingCsrf.status, 403)

    await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader(cookies),
        "X-CSRF-Token": loginBody.csrfToken,
      },
    })

    const replay = await fetch(`${baseUrl}/api/session`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(replay.status, 401)
    const replayBody = (await replay.json()) as { code: string }
    assert.equal(replayBody.code, "SESSION_EXPIRED")
  })

  it("recovers the admin password without SMTP and invalidates sessions", async () => {
    __testOnly_resetRateLimits()

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@fixture.studio",
        password: ADMIN_PASSWORD,
      }),
    })
    const cookies = collectSetCookies(loginResponse)

    const newPassword = "replacement horse battery 88"
    const recoveryResponse = await fetch(`${baseUrl}/api/auth/recover-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recoveryToken: RECOVERY_TOKEN,
        email: "admin@fixture.studio",
        newPassword,
        confirmPassword: newPassword,
      }),
    })
    assert.equal(recoveryResponse.status, 204)

    const staleSession = await fetch(`${baseUrl}/api/session`, {
      headers: { Cookie: cookieHeader(cookies) },
    })
    assert.equal(staleSession.status, 401)

    const relogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@fixture.studio",
        password: newPassword,
      }),
    })
    assert.equal(relogin.status, 200)
  })

  it("records security audit events for bootstrap and failed login", async () => {
    assert.ok(getAuditEventCount() > 0)
  })

  it("rate limits repeated login attempts", async () => {
    __testOnly_resetRateLimits()

    let limited = false
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@fixture.studio",
          password: "definitely-wrong-password",
        }),
      })

      if (response.status === 429) {
        limited = true
        const body = (await response.json()) as { code: string }
        assert.equal(body.code, "RATE_LIMITED")
        assert.ok(response.headers.get("retry-after"))
        break
      }
    }

    assert.equal(limited, true)
  })
})

describe("Phase 2 concurrent setup", () => {
  it("allows exactly one bootstrap admin under concurrent setup requests", async () => {
    const concurrentDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "playblast-auth-concurrent-"),
    )
    const concurrentDb = path.join(concurrentDir, "test.db")
    process.env.DB_PATH = concurrentDb
    initDatabase(concurrentDb)

    const app = createApp()
    const concurrentServer = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance))
    })
    const address = concurrentServer.address()
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind concurrent test server")
    }
    const concurrentBaseUrl = `http://127.0.0.1:${address.port}`

    __testOnly_resetRateLimits()

    const attempts = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        fetch(`${concurrentBaseUrl}/api/setup/admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Admin ${index}`,
            email: `admin-${index}@fixture.studio`,
            password: ADMIN_PASSWORD,
            confirmPassword: ADMIN_PASSWORD,
          }),
        }),
      ),
    )

    const successes = attempts.filter((response) => response.status === 201)
    const conflicts = attempts.filter((response) => response.status === 409)
    assert.equal(successes.length, 1)
    assert.equal(conflicts.length, 4)

    await new Promise<void>((resolve, reject) => {
      concurrentServer.close((err) => (err ? reject(err) : resolve()))
    })
    closeDatabase()
    fs.rmSync(concurrentDir, { recursive: true, force: true })
    process.env.DB_PATH = dbPath
    initDatabase(dbPath)
  })
})

describe("Phase 2 disabled user handling", () => {
  it("rejects login for a disabled admin", async () => {
    __testOnly_resetRateLimits()

    const { getDrizzle } = await import("../db/drizzle.js")
    const { users } = await import("../db/schema/identity.js")
    const { eq } = await import("drizzle-orm")

    const db = getDrizzle()
    db.update(users)
      .set({ disabled: true })
      .where(eq(users.emailNormalized, "admin@fixture.studio"))
      .run()

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@fixture.studio",
        password: "replacement horse battery 88",
      }),
    })
    assert.equal(response.status, 401)

    db.update(users)
      .set({ disabled: false })
      .where(eq(users.emailNormalized, "admin@fixture.studio"))
      .run()
  })
})

describe("Phase 2 first-run negative access", () => {
  it("keeps public setup status available while blocking authenticated studio APIs before completion", async () => {
    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-auth-fresh-"))
    const freshDb = path.join(freshDir, "test.db")
    process.env.DB_PATH = freshDb
    initDatabase(freshDb)

    const app = createApp()
    const freshServer = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance))
    })
    const address = freshServer.address()
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind fresh test server")
    }
    const freshBaseUrl = `http://127.0.0.1:${address.port}`

    const setupStatus = await fetch(`${freshBaseUrl}/api/setup/status`)
    assert.equal(setupStatus.status, 200)

    const studio = await fetch(`${freshBaseUrl}/api/studio`)
    assert.equal(studio.status, 401)

    const projects = await fetch(`${freshBaseUrl}/api/projects`)
    assert.equal(projects.status, 401)

    await new Promise<void>((resolve, reject) => {
      freshServer.close((err) => (err ? reject(err) : resolve()))
    })
    closeDatabase()
    fs.rmSync(freshDir, { recursive: true, force: true })
    process.env.DB_PATH = dbPath
    initDatabase(dbPath)
  })
})
