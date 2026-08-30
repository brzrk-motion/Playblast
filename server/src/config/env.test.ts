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
    delete process.env.UPLOAD_DIR
    delete process.env.DB_PATH
    delete process.env.MAX_UPLOAD_SIZE
    delete process.env.NODE_ENV

    assert.equal(config.port, 3000)
    assert.equal(config.uploadDir, "/app/uploads")
    assert.equal(config.dbPath, "/app/data/playblast.db")
    assert.equal(config.maxUploadSizeMb, 5000)
    assert.equal(config.nodeEnv, "development")
    assert.equal(getMaxUploadSizeBytes(), 5000 * 1024 * 1024)
  })

  it("reads overrides from environment variables", () => {
    process.env.PORT = "4000"
    process.env.UPLOAD_DIR = "/tmp/custom-uploads"
    process.env.DB_PATH = "/tmp/custom.db"
    process.env.MAX_UPLOAD_SIZE = "1024"
    process.env.NODE_ENV = "production"

    assert.equal(config.port, 4000)
    assert.equal(config.uploadDir, "/tmp/custom-uploads")
    assert.equal(config.dbPath, "/tmp/custom.db")
    assert.equal(config.maxUploadSizeMb, 1024)
    assert.equal(config.nodeEnv, "production")
    assert.equal(getMaxUploadSizeBytes(), 1024 * 1024 * 1024)
  })

  it("rejects invalid runtime environments", () => {
    process.env.NODE_ENV = "Production"
    assert.throws(() => config.nodeEnv, /Invalid NODE_ENV value/)
  })
})
