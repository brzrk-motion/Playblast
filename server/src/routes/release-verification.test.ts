import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import {
  API_ROUTES,
  assertAdminSuperset,
  getCapabilitiesForRole,
  hasCapability,
  type ApiRouteDefinition,
} from "@playblast/shared"
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

const PLACEHOLDER_IDS: Record<string, string> = {
  projectId: "00000000-0000-4000-8000-000000000001",
  deliverableId: "00000000-0000-4000-8000-000000000002",
  versionId: "00000000-0000-4000-8000-000000000003",
  commentId: "00000000-0000-4000-8000-000000000004",
  invitationId: "00000000-0000-4000-8000-000000000005",
  userId: "00000000-0000-4000-8000-000000000006",
  id: "00000000-0000-4000-8000-000000000007",
  milestoneId: "00000000-0000-4000-8000-000000000008",
  taskId: "00000000-0000-4000-8000-000000000009",
  timeLogId: "00000000-0000-4000-8000-00000000000a",
  serviceId: "00000000-0000-4000-8000-00000000000b",
  invoiceId: "00000000-0000-4000-8000-00000000000c",
  logId: "00000000-0000-4000-8000-00000000000d",
  token: "fixture-invite-token",
  version: "v1",
  filename: "fixture.mp4",
}

/** Routes that accept anonymous callers without a session. */
const SAFE_PUBLIC_GET_ROUTES = new Set([
  "GET /health",
  "GET /api/setup/status",
  "GET /api/invites/:token",
])

/** Mutating public routes are not probed to avoid auth rate limits. */
const SKIP_UNAUTH_PROBE = new Set([
  "POST /api/auth/login",
  "POST /api/auth/logout",
  "POST /api/auth/recover-admin",
  "POST /api/invites/:token/accept",
])

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

function routeKey(route: ApiRouteDefinition): string {
  return `${route.method} ${route.path}`
}

function resolveRoutePath(routePath: string): string {
  return routePath.replace(/:([A-Za-z]+)/g, (_match, param: string) => {
    return PLACEHOLDER_IDS[param] ?? randomUUID()
  })
}

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

function roleHasRouteAccess(role: "admin" | "creative" | "proofing", route: ApiRouteDefinition): boolean {
  switch (route.access) {
    case "public":
      return true
    case "setup":
      return role === "admin"
    case "admin":
      return role === "admin"
    case "authenticated":
      return route.requiredCapabilities.every((capability) => hasCapability(role, capability))
    default:
      return false
  }
}

async function probeRoute(
  route: ApiRouteDefinition,
  cookies: string[],
  csrfToken: string,
): Promise<number> {
  const url = `${baseUrl}${resolveRoutePath(route.path)}`
  const useJsonBody = route.method !== "GET" && route.method !== "DELETE"
  const headers =
    cookies.length > 0 ? authHeaders(cookies, csrfToken, useJsonBody) : undefined

  const response = await fetch(url, {
    method: route.method,
    headers,
    body: useJsonBody ? JSON.stringify({}) : undefined,
  })

  return response.status
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-release-"))
  dbPath = path.join(tempDir, "test.db")
  uploadDir = path.join(tempDir, "uploads")
  fs.mkdirSync(uploadDir, { recursive: true })

  process.env.DB_PATH = dbPath
  process.env.UPLOAD_DIR = uploadDir
  process.env.SESSION_SECRET = "release-verification-secret-32chars"
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

  otherProjectId = randomUUID()
  getDb()
    .prepare(
      `INSERT INTO projects (id, name, createdAt, status, studioId)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(otherProjectId, "Other Studio Project", now, "active", otherStudioId)
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

describe("Release verification — API route inventory", () => {
  it("documents a non-empty canonical route inventory without duplicates", () => {
    assert.ok(API_ROUTES.length >= 80, "expected a comprehensive API route inventory")
    const keys = API_ROUTES.map(routeKey)
    assert.equal(new Set(keys).size, keys.length, "duplicate method/path entries in API_ROUTES")
  })

  it("asserts Admin is a superset of Creative and Proofing capabilities", () => {
    assert.doesNotThrow(() => assertAdminSuperset())
    for (const role of ["creative", "proofing"] as const) {
      for (const capability of getCapabilitiesForRole(role)) {
        assert.ok(hasCapability("admin", capability))
      }
    }
  })

  it("classifies session and password routes as authenticated", () => {
    const sessionRoute = API_ROUTES.find((route) => route.path === "/api/session")
    const passwordRoute = API_ROUTES.find((route) => route.path === "/api/auth/password")
    assert.equal(sessionRoute?.access, "authenticated")
    assert.equal(passwordRoute?.access, "authenticated")
  })
})

describe("Release verification — authorization matrix", () => {
  it("rejects unauthenticated callers on protected routes", async () => {
    const failures: string[] = []

    for (const route of API_ROUTES) {
      if (route.access === "public") {
        continue
      }

      if (SKIP_UNAUTH_PROBE.has(routeKey(route))) {
        continue
      }

      const status = await probeRoute(route, [], "")
      const unauthenticatedBlocked =
        status === 401 || (route.access === "setup" && status === 409)
      if (!unauthenticatedBlocked) {
        failures.push(`${routeKey(route)} returned ${status}, expected 401 or 409`)
      }
    }

    assert.equal(failures.length, 0, failures.join("\n"))
  })

  it("allows safe public GET routes without a session", async () => {
    for (const route of API_ROUTES) {
      if (!SAFE_PUBLIC_GET_ROUTES.has(routeKey(route))) {
        continue
      }

      const status = await probeRoute(route, [], "")
      assert.notEqual(status, 401, `${routeKey(route)} should be public`)
    }
  })

  it("denies Creative and Proofing on admin and setup routes", async () => {
    const failures: string[] = []

    for (const route of API_ROUTES) {
      if (route.access !== "admin" && route.access !== "setup") {
        continue
      }

      for (const [role, cookies, csrf] of [
        ["creative", creativeCookies, creativeCsrf],
        ["proofing", proofingCookies, proofingCsrf],
      ] as const) {
        const status = await probeRoute(route, cookies, csrf)
        const denied = status === 403 || (route.access === "setup" && status === 409)
        if (!denied) {
          failures.push(`${role} on ${routeKey(route)} returned ${status}, expected 403 or 409`)
        }
      }
    }

    assert.equal(failures.length, 0, failures.join("\n"))
  })

  it("denies roles missing required capabilities on authenticated routes", async () => {
    const failures: string[] = []

    for (const route of API_ROUTES) {
      if (route.access !== "authenticated") {
        continue
      }

      for (const role of ["creative", "proofing"] as const) {
        if (roleHasRouteAccess(role, route)) {
          continue
        }

        const cookies = role === "creative" ? creativeCookies : proofingCookies
        const csrf = role === "creative" ? creativeCsrf : proofingCsrf
        const status = await probeRoute(route, cookies, csrf)
        if (status !== 403) {
          failures.push(`${role} on ${routeKey(route)} returned ${status}, expected 403`)
        }
      }
    }

    assert.equal(failures.length, 0, failures.join("\n"))
  })

  it("allows authenticated roles with required capabilities (not 401/403)", async () => {
    const failures: string[] = []
    const sampleRoutes = API_ROUTES.filter(
      (route) =>
        route.access === "authenticated" &&
        route.method === "GET" &&
        route.requiredCapabilities.length > 0,
    )

    for (const route of sampleRoutes) {
      for (const role of ["creative", "proofing"] as const) {
        if (!roleHasRouteAccess(role, route)) {
          continue
        }

        const cookies = role === "creative" ? creativeCookies : proofingCookies
        const csrf = role === "creative" ? creativeCsrf : proofingCsrf
        const status = await probeRoute(route, cookies, csrf)
        if (status === 401 || status === 403) {
          failures.push(`${role} on ${routeKey(route)} returned ${status}, expected authorization pass`)
        }
      }
    }

    assert.equal(failures.length, 0, failures.join("\n"))
  })
})

describe("Release verification — single-studio invariant", () => {
  it("returns not found for cross-studio project reads", async () => {
    const response = await fetch(`${baseUrl}/api/projects/${otherProjectId}`, {
      headers: authHeaders(adminCookies, adminCsrf, false),
    })
    assert.equal(response.status, 404)
  })

  it("scopes project lists to the authenticated studio", async () => {
    const response = await fetch(`${baseUrl}/api/projects`, {
      headers: authHeaders(proofingCookies, proofingCsrf, false),
    })
    assert.equal(response.status, 200)
    const projects = (await response.json()) as Array<{ id: string }>
    assert.ok(!projects.some((entry) => entry.id === otherProjectId))
  })
})
