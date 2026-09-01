import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import {
  createApiError,
  isApiErrorEnvelope,
  type SetupStatusResponse,
  type RoleCapabilitiesResponse,
} from "@playblast/shared"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import {
  buildCapabilitiesResponse,
  buildInvitationsResponse,
  buildStudioProfileResponse,
  buildUsersResponse,
} from "./identity.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-identity-api-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
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
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

async function getJson<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(`${baseUrl}${path}`, init)
  const body = (await response.json()) as T
  return { status: response.status, body }
}

describe("identity API contracts", () => {
  it("GET /api/setup/status returns the setup contract on a fresh database", async () => {
    const { status, body } = await getJson<SetupStatusResponse>("/api/setup/status")

    assert.equal(status, 200)
    assert.equal(body.status, "pending")
    assert.equal(body.nextRoute, "/setup")
    assert.equal(body.setupComplete, false)
  })

  it("GET /api/session returns the canonical unauthenticated envelope", async () => {
    const { status, body } = await getJson<unknown>("/api/session")

    assert.equal(status, 401)
    assert.ok(isApiErrorEnvelope(body))
    assert.equal(body.code, "UNAUTHENTICATED")
    assert.equal(body.error, createApiError("UNAUTHENTICATED").error)
  })

  it("GET /api/studio returns unauthenticated before bootstrap", async () => {
    const { status, body } = await getJson<unknown>("/api/studio")

    assert.equal(status, 401)
    assert.ok(isApiErrorEnvelope(body))
    assert.equal(body.code, "UNAUTHENTICATED")
  })

  it("GET /api/users and /api/invitations require authentication before setup completion", async () => {
    for (const path of ["/api/users", "/api/invitations"]) {
      const { status, body } = await getJson<unknown>(path)
      assert.equal(status, 401)
      assert.ok(isApiErrorEnvelope(body))
      assert.equal(body.code, "UNAUTHENTICATED")
    }
  })

  it("GET /api/capabilities returns unauthenticated without a session", async () => {
    const { status, body } = await getJson<unknown>("/api/capabilities")
    assert.equal(status, 401)
    assert.ok(isApiErrorEnvelope(body))
    assert.equal(body.code, "UNAUTHENTICATED")
  })
})

describe("identity DTO builders", () => {
  it("builds role capability responses from the shared matrix", () => {
    const adminCaps = buildCapabilitiesResponse("admin")
    const proofingCaps = buildCapabilitiesResponse("proofing")

    assert.equal(adminCaps.role, "admin")
    assert.ok(adminCaps.capabilities.includes("team.manage"))
    assert.ok(!proofingCaps.capabilities.includes("team.manage"))
    assert.ok(proofingCaps.capabilities.includes("comments.create"))
  })

  it("returns null studio profile when no studio exists", () => {
    assert.equal(buildStudioProfileResponse(), null)
    assert.deepEqual(buildUsersResponse(), [])
    assert.deepEqual(buildInvitationsResponse(), [])
  })

  it("matches shared RoleCapabilitiesResponse shape", () => {
    const response: RoleCapabilitiesResponse = buildCapabilitiesResponse("creative")
    assert.equal(response.role, "creative")
    assert.ok(Array.isArray(response.capabilities))
  })
})
