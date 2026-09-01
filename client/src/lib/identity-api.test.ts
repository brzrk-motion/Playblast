import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../../../server/src/app.js"
import { closeDatabase, initDatabase } from "../../../server/src/storage/db.js"
import {
  IdentityApiError,
  fetchSetupStatus,
  isIdentityApiError,
} from "./identity-api.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""
let originalFetch: typeof globalThis.fetch

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-client-identity-"))
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
  originalFetch = globalThis.fetch
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const resolved = url.startsWith("/") ? `${baseUrl}${url}` : url
    return originalFetch(resolved, init)
  }) as typeof fetch
})

after(async () => {
  globalThis.fetch = originalFetch

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  delete process.env.DB_PATH
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("identity API client", () => {
  it("fetches setup status from the live server contract", async () => {
    const status = await fetchSetupStatus()
    assert.equal(status.status, "pending")
    assert.equal(status.nextRoute, "/setup")
    assert.equal(status.setupComplete, false)
  })

  it("maps unauthenticated session responses to IdentityApiError", async () => {
    await assert.rejects(
      async () => {
        const response = await originalFetch(`${baseUrl}/api/session`)
        const body = await response.json()
        if (!response.ok) {
          throw new IdentityApiError(response.status, body)
        }
      },
      (error: unknown) => {
        assert.ok(isIdentityApiError(error))
        assert.equal(error.code, "UNAUTHENTICATED")
        return true
      },
    )
  })
})
