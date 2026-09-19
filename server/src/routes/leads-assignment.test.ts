import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import type { UserRole } from "@playblast/shared"
import { createApp } from "../app.js"
import { hashPasswordSync, normalizeEmail } from "../auth/password.js"
import { getDrizzle } from "../db/drizzle.js"
import { users } from "../db/schema/identity.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import {
  authHeaders,
  completeStudioSetup,
  loginAccount,
  setupAdminAccount,
} from "../test/auth-helpers.js"

const ADMIN_PASSWORD = "correct horse battery 99"
const ACCOUNT_EXECUTIVE_PASSWORD = "account executive password 99 ok"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""
let adminCookies: string[] = []
let adminCsrf = ""
let adminUserId = ""
let accountExecutiveCookies: string[] = []
let accountExecutiveCsrf = ""
let accountExecutiveUserId = ""

function insertRoleUser(
  studioId: string,
  role: Exclude<UserRole, "admin">,
  email: string,
  password: string,
): string {
  const db = getDrizzle()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.insert(users)
    .values({
      id,
      studioId,
      name: "Fixture Account Executive",
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

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-lead-assignment-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  process.env.SESSION_SECRET = "lead-assignment-test-secret-32chars"
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
  await completeStudioSetup(baseUrl, adminCookies, adminCsrf)

  accountExecutiveUserId = insertRoleUser(
    admin.session.studio.id,
    "account_executive",
    "account-executive@fixture.studio",
    ACCOUNT_EXECUTIVE_PASSWORD,
  )

  const accountExecutive = await loginAccount(
    baseUrl,
    "account-executive@fixture.studio",
    ACCOUNT_EXECUTIVE_PASSWORD,
  )
  accountExecutiveCookies = accountExecutive.cookies
  accountExecutiveCsrf = accountExecutive.csrfToken
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  delete process.env.DB_PATH
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("lead assignment routes", () => {
  it("defaults new leads to the creating user and supports owner filtering", async () => {
    const createResponse = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: authHeaders(accountExecutiveCookies, accountExecutiveCsrf),
      body: JSON.stringify({
        name: "AE Lead",
        email: "ae-lead@example.com",
      }),
    })
    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as {
      id: string
      assignedToUserId: string
    }
    assert.equal(created.assignedToUserId, accountExecutiveUserId)

    const adminLeadResponse = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: authHeaders(adminCookies, adminCsrf),
      body: JSON.stringify({
        name: "Admin Lead",
        email: "admin-lead@example.com",
      }),
    })
    assert.equal(adminLeadResponse.status, 201)
    const adminLead = (await adminLeadResponse.json()) as {
      id: string
      assignedToUserId: string
    }
    assert.equal(adminLead.assignedToUserId, adminUserId)

    const mineResponse = await fetch(
      `${baseUrl}/api/leads?assignedToUserId=me`,
      { headers: authHeaders(accountExecutiveCookies, accountExecutiveCsrf, false) },
    )
    assert.equal(mineResponse.status, 200)
    const mine = (await mineResponse.json()) as Array<{ id: string }>
    assert.ok(mine.some((lead) => lead.id === created.id))
    assert.ok(!mine.some((lead) => lead.id === adminLead.id))
  })

  it("lets admins reassign leads and blocks account executives from reassigning", async () => {
    const createResponse = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: authHeaders(accountExecutiveCookies, accountExecutiveCsrf),
      body: JSON.stringify({
        name: "Reassign Lead",
        email: "reassign@example.com",
      }),
    })
    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as { id: string }

    const forbiddenResponse = await fetch(`${baseUrl}/api/leads/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(accountExecutiveCookies, accountExecutiveCsrf),
      body: JSON.stringify({ assignedToUserId: adminUserId }),
    })
    assert.equal(forbiddenResponse.status, 403)

    const adminPatchResponse = await fetch(`${baseUrl}/api/leads/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(adminCookies, adminCsrf),
      body: JSON.stringify({ assignedToUserId: adminUserId }),
    })
    assert.equal(adminPatchResponse.status, 200)
    const reassigned = (await adminPatchResponse.json()) as {
      assignedToUserId: string
    }
    assert.equal(reassigned.assignedToUserId, adminUserId)
  })
})
