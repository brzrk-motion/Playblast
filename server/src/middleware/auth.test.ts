import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import type { Server } from "node:http"
import path from "node:path"
import { createApp } from "../app.js"
import { closeDatabase } from "../storage/db.js"

let server: Server
let baseUrl: string
let tempDir: string
const previousNodeEnv = process.env.NODE_ENV
const previousUser = process.env.PLAYBLAST_AUTH_USER
const previousPassword = process.env.PLAYBLAST_AUTH_PASSWORD
const previousDbPath = process.env.DB_PATH

before(async () => {
  process.env.NODE_ENV = "production"
  process.env.PLAYBLAST_AUTH_USER = "pilot"
  process.env.PLAYBLAST_AUTH_PASSWORD = "correct horse battery staple"
  tempDir = await mkdtemp("/tmp/playblast-auth-test-")
  process.env.DB_PATH = path.join(tempDir, "playblast.db")

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
  if (previousUser === undefined) delete process.env.PLAYBLAST_AUTH_USER
  else process.env.PLAYBLAST_AUTH_USER = previousUser
  if (previousPassword === undefined) delete process.env.PLAYBLAST_AUTH_PASSWORD
  else process.env.PLAYBLAST_AUTH_PASSWORD = previousPassword
  if (previousDbPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousDbPath
})

describe("production authentication", () => {
  it("keeps health public", async () => {
    const response = await fetch(`${baseUrl}/health`)
    assert.equal(response.status, 200)
  })

  it("rejects application requests without credentials", async () => {
    const response = await fetch(`${baseUrl}/api/projects`)
    assert.equal(response.status, 401)
    assert.equal(response.headers.get("www-authenticate"), 'Basic realm="Playblast pilot"')
  })

  it("rejects incorrect credentials", async () => {
    const credentials = Buffer.from("pilot:wrong password").toString("base64")
    const response = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    assert.equal(response.status, 401)
  })

  it("accepts the case-insensitive Basic scheme", async () => {
    const credentials = Buffer.from(
      "pilot:correct horse battery staple",
    ).toString("base64")
    const response = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `basic ${credentials}` },
    })
    assert.equal(response.status, 200)
  })

  it("accepts valid credentials", async () => {
    const credentials = Buffer.from(
      "pilot:correct horse battery staple",
    ).toString("base64")
    const response = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    assert.equal(response.status, 200)
  })
})
