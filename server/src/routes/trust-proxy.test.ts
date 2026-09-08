import { after, afterEach, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { Server } from "node:http"
import type { Request, Response } from "express"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

const previousProxyHops = process.env.PROXY_HOPS
const previousSessionSecret = process.env.SESSION_SECRET
const previousDbPath = process.env.DB_PATH
const previousUploadDir = process.env.UPLOAD_DIR
const previousNodeEnv = process.env.NODE_ENV

let tempDir = ""

afterEach(() => {
  if (previousProxyHops === undefined) {
    delete process.env.PROXY_HOPS
  } else {
    process.env.PROXY_HOPS = previousProxyHops
  }
})

after(() => {
  if (previousSessionSecret === undefined) {
    delete process.env.SESSION_SECRET
  } else {
    process.env.SESSION_SECRET = previousSessionSecret
  }
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
  if (previousNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = previousNodeEnv
  }
  if (previousProxyHops === undefined) {
    delete process.env.PROXY_HOPS
  } else {
    process.env.PROXY_HOPS = previousProxyHops
  }
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

async function listenApp(app: ReturnType<typeof createApp>): Promise<{
  server: Server
  baseUrl: string
}> {
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance))
  })
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind trust-proxy test server")
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

describe("Express trust proxy (PROXY_HOPS)", () => {
  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-trust-proxy-"))
    process.env.DB_PATH = path.join(tempDir, "playblast.db")
    process.env.UPLOAD_DIR = path.join(tempDir, "uploads")
    process.env.SESSION_SECRET = "trust-proxy-test-session-secret-32chars"
    process.env.NODE_ENV = "development"
    initDatabase()
  })

  after(() => {
    closeDatabase()
  })

  it("ignores forwarded proto/IP when PROXY_HOPS defaults to 0", async () => {
    delete process.env.PROXY_HOPS
    const app = createApp()
    app.get("/__trust-probe", (req: Request, res: Response) => {
      res.json({
        ip: req.ip,
        secure: req.secure,
        protocol: req.protocol,
        trustProxy: app.get("trust proxy"),
      })
    })

    const { server, baseUrl } = await listenApp(app)
    try {
      const response = await fetch(`${baseUrl}/__trust-probe`, {
        headers: {
          "X-Forwarded-For": "203.0.113.77",
          "X-Forwarded-Proto": "https",
          "X-Forwarded-Host": "playblast.example.com",
          "X-Real-IP": "203.0.113.77",
        },
      })
      assert.equal(response.status, 200)
      const body = (await response.json()) as {
        ip: string
        secure: boolean
        protocol: string
        trustProxy: unknown
      }

      assert.equal(body.secure, false)
      assert.equal(body.protocol, "http")
      assert.notEqual(body.ip, "203.0.113.77")
      assert.ok(
        body.trustProxy === false ||
          body.trustProxy === undefined ||
          body.trustProxy === 0,
      )
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
    }
  })

  it("honors forwarded proto/IP when PROXY_HOPS=1", async () => {
    process.env.PROXY_HOPS = "1"
    const app = createApp()
    app.get("/__trust-probe", (req: Request, res: Response) => {
      res.json({
        ip: req.ip,
        secure: req.secure,
        protocol: req.protocol,
        trustProxy: app.get("trust proxy"),
      })
    })

    const { server, baseUrl } = await listenApp(app)
    try {
      const response = await fetch(`${baseUrl}/__trust-probe`, {
        headers: {
          "X-Forwarded-For": "198.51.100.20",
          "X-Forwarded-Proto": "https",
          "X-Forwarded-Host": "playblast.example.com",
          "X-Real-IP": "198.51.100.20",
        },
      })
      assert.equal(response.status, 200)
      const body = (await response.json()) as {
        ip: string
        secure: boolean
        protocol: string
        trustProxy: unknown
      }

      assert.equal(body.trustProxy, 1)
      assert.equal(body.secure, true)
      assert.equal(body.protocol, "https")
      assert.equal(body.ip, "198.51.100.20")
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
    }
  })
})
