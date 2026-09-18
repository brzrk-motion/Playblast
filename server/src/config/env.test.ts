import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { config, getMaxUploadSizeBytes } from "./env.js"

const originalEnv = { ...process.env }

const COMPLETE_SMTP_ENV = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "smtp-user",
  SMTP_PASS: "smtp-pass",
  SMTP_FROM: "noreply@example.com",
} as const

function clearSmtpEnv(): void {
  delete process.env.SMTP_HOST
  delete process.env.SMTP_PORT
  delete process.env.SMTP_SECURE
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  delete process.env.SMTP_FROM
  delete process.env.SMTP_REPLY_TO
  delete process.env.MAILPIT_URL
}

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

describe("SMTP env contract", () => {
  it("reports smtpConfiguredFromEnv=false when SMTP env is incomplete", () => {
    clearSmtpEnv()
    process.env.NODE_ENV = "development"

    assert.equal(config.smtpConfiguredFromEnv, false)
    assert.equal(config.smtpFromEnv, null)
  })

  it("reports smtpConfiguredFromEnv=true when required SMTP env vars are present", () => {
    clearSmtpEnv()
    Object.assign(process.env, COMPLETE_SMTP_ENV)
    process.env.NODE_ENV = "production"

    assert.equal(config.smtpConfiguredFromEnv, true)
    assert.deepEqual(config.smtpFromEnv, {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "smtp-user",
      pass: "smtp-pass",
      from: "noreply@example.com",
    })
  })

  it("includes optional SMTP_REPLY_TO when set", () => {
    clearSmtpEnv()
    Object.assign(process.env, COMPLETE_SMTP_ENV)
    process.env.SMTP_REPLY_TO = "support@example.com"

    assert.deepEqual(config.smtpFromEnv, {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "smtp-user",
      pass: "smtp-pass",
      from: "noreply@example.com",
      replyTo: "support@example.com",
    })
  })

  it("treats whitespace-only SMTP env values as incomplete", () => {
    clearSmtpEnv()
    Object.assign(process.env, COMPLETE_SMTP_ENV)
    process.env.SMTP_HOST = "   "

    assert.equal(config.smtpConfiguredFromEnv, false)
    assert.equal(config.smtpFromEnv, null)
  })

  it("rejects invalid SMTP_PORT and SMTP_SECURE values when env is complete", () => {
    clearSmtpEnv()
    Object.assign(process.env, COMPLETE_SMTP_ENV)
    process.env.SMTP_PORT = "70000"
    assert.throws(() => config.smtpFromEnv, /Invalid SMTP_PORT value/)

    process.env.SMTP_PORT = "587"
    process.env.SMTP_SECURE = "maybe"
    assert.throws(() => config.smtpFromEnv, /Invalid SMTP_SECURE value/)
  })

  it("exposes MAILPIT_URL in non-production environments", () => {
    clearSmtpEnv()
    process.env.NODE_ENV = "development"
    process.env.MAILPIT_URL = "http://localhost:8025"

    assert.equal(config.mailpitUrl, "http://localhost:8025")
  })

  it("ignores MAILPIT_URL when NODE_ENV=production", () => {
    clearSmtpEnv()
    process.env.NODE_ENV = "production"
    process.env.MAILPIT_URL = "http://localhost:8025"

    assert.equal(config.mailpitUrl, undefined)
  })
})
