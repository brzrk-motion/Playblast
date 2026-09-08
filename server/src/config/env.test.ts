import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { config, getMaxUploadSizeBytes } from "./env.js"

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("runtime config", () => {
  it("uses documented defaults when env vars are unset", () => {
    delete process.env.PORT
    delete process.env.HOST
    delete process.env.UPLOAD_DIR
    delete process.env.DB_PATH
    delete process.env.MAX_UPLOAD_SIZE
    delete process.env.NODE_ENV
    delete process.env.PROXY_HOPS

    assert.equal(config.port, 3000)
    assert.equal(config.host, "0.0.0.0")
    assert.equal(config.uploadDir, "/app/uploads")
    assert.equal(config.dbPath, "/app/data/playblast.db")
    assert.equal(config.maxUploadSizeMb, 5000)
    assert.equal(config.nodeEnv, "development")
    assert.equal(config.proxyHops, 0)
    assert.equal(getMaxUploadSizeBytes(), 5000 * 1024 * 1024)
  })

  it("reads overrides from environment variables", () => {
    process.env.PORT = "4000"
    process.env.HOST = "127.0.0.1"
    process.env.UPLOAD_DIR = "/tmp/custom-uploads"
    process.env.DB_PATH = "/tmp/custom.db"
    process.env.MAX_UPLOAD_SIZE = "1024"
    process.env.NODE_ENV = "production"
    process.env.PROXY_HOPS = "1"

    assert.equal(config.port, 4000)
    assert.equal(config.host, "127.0.0.1")
    assert.equal(config.uploadDir, "/tmp/custom-uploads")
    assert.equal(config.dbPath, "/tmp/custom.db")
    assert.equal(config.maxUploadSizeMb, 1024)
    assert.equal(config.nodeEnv, "production")
    assert.equal(config.proxyHops, 1)
    assert.equal(getMaxUploadSizeBytes(), 1024 * 1024 * 1024)
  })

  it("rejects invalid runtime environments", () => {
    process.env.NODE_ENV = "Production"
    assert.throws(() => config.nodeEnv, /Invalid NODE_ENV value/)
  })

  it("rejects invalid PROXY_HOPS values", () => {
    process.env.PROXY_HOPS = "-1"
    assert.throws(() => config.proxyHops, /Invalid PROXY_HOPS value/)

    process.env.PROXY_HOPS = "1.5"
    assert.throws(() => config.proxyHops, /Invalid PROXY_HOPS value/)

    process.env.PROXY_HOPS = "33"
    assert.throws(() => config.proxyHops, /Invalid PROXY_HOPS value/)
  })
})
