import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import type { Server } from "node:http"
import path from "node:path"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

let server: Server
let baseUrl: string
let tempDir: string
const previousNodeEnv = process.env.NODE_ENV
const previousEmergency = process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH
const previousUser = process.env.PLAYBLAST_AUTH_USER
const previousPassword = process.env.PLAYBLAST_AUTH_PASSWORD
const previousDbPath = process.env.DB_PATH
const previousSessionSecret = process.env.SESSION_SECRET

before(async () => {
  process.env.NODE_ENV = "production"
  process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH = "true"
  process.env.PLAYBLAST_AUTH_USER = "pilot"
  process.env.PLAYBLAST_AUTH_PASSWORD = "correct horse battery staple"
  process.env.SESSION_SECRET = "emergency-basic-auth-test-secret-32chars"
  tempDir = await mkdtemp("/tmp/playblast-auth-test-")
  process.env.DB_PATH = path.join(tempDir, "playblast.db")
  initDatabase(process.env.DB_PATH)

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
  await rm(tempDir, { recursive: true, force: true })

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv
  if (previousEmergency === undefined) delete process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH
  else process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH = previousEmergency
  if (previousUser === undefined) delete process.env.PLAYBLAST_AUTH_USER
  else process.env.PLAYBLAST_AUTH_USER = previousUser
  if (previousPassword === undefined) delete process.env.PLAYBLAST_AUTH_PASSWORD
  else process.env.PLAYBLAST_AUTH_PASSWORD = previousPassword
  if (previousDbPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousDbPath
  if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = previousSessionSecret
})

describe("emergency bootstrap Basic Auth", () => {
  it("keeps health and setup routes public", async () => {
    const health = await fetch(`${baseUrl}/health`)
    assert.equal(health.status, 200)

    const setupStatus = await fetch(`${baseUrl}/api/setup/status`)
    assert.equal(setupStatus.status, 200)
  })

  it("protects non-bootstrap application routes before setup completes", async () => {
    const response = await fetch(`${baseUrl}/api/projects`)
    assert.equal(response.status, 401)
    assert.equal(
      response.headers.get("www-authenticate"),
      'Basic realm="Playblast emergency bootstrap"',
    )
  })

  it("accepts valid emergency credentials for protected routes", async () => {
    const credentials = Buffer.from(
      "pilot:correct horse battery staple",
    ).toString("base64")
    const response = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    // Emergency Basic Auth passes; secured routes still require a session.
    assert.notEqual(
      response.headers.get("www-authenticate"),
      'Basic realm="Playblast emergency bootstrap"',
    )
    assert.equal(response.status, 401)
    const body = (await response.json()) as { code: string }
    assert.equal(body.code, "UNAUTHENTICATED")
  })
})

describe("normal production access without emergency Basic Auth", () => {
  it("does not require Basic Auth when emergency mode is disabled", async () => {
    delete process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH

    const app = createApp()
    const localServer = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance))
    })
    const address = localServer.address()
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind local test server")
    }
    const localBaseUrl = `http://127.0.0.1:${address.port}`

    const response = await fetch(`${localBaseUrl}/api/projects`)
    assert.equal(response.status, 401)
    assert.equal(response.headers.get("www-authenticate"), null)
    const body = (await response.json()) as { code: string }
    assert.equal(body.code, "UNAUTHENTICATED")

    await new Promise<void>((resolve, reject) => {
      localServer.close((err) => (err ? reject(err) : resolve()))
    })

    process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH = "true"
  })
})
