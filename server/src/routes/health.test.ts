import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"

let server: Server
let baseUrl: string

before(async () => {
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
})

describe("GET /health", () => {
  it("returns 200 with status, uptime, and timestamp", async () => {
    const response = await fetch(`${baseUrl}/health`)

    assert.equal(response.status, 200)

    const body = (await response.json()) as {
      status: string
      uptime: number
      timestamp: string
    }

    assert.equal(body.status, "ok")
    assert.equal(typeof body.uptime, "number")
    assert.ok(body.uptime >= 0)
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
