import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { getDrizzle } from "../db/drizzle.js"
import { studioSmtpSettings, studios } from "../db/schema/identity.js"
import { initDatabase, closeDatabase } from "../storage/db.js"
import {
  buildMailpitSmtpConnectionConfig,
  resolveMailpitSmtpHost,
  resolveMailpitSmtpPort,
} from "./mailpit.js"
import {
  getSmtpSettings,
  testSmtpDelivery,
  upsertSmtpSettings,
} from "./smtp-service.js"
import {
  setSmtpTransport,
  type OutboundEmail,
  type SmtpTransport,
} from "./smtp-transport.js"

const originalEnv = { ...process.env }

let tempDir = ""
let dbPath = ""
let capturedMessages: OutboundEmail[] = []
const originalFetch = globalThis.fetch

const mockTransport: SmtpTransport = {
  async send(_config, message) {
    capturedMessages.push(message)
    return { accepted: true }
  },
}

function clearSmtpEnv(): void {
  delete process.env.SMTP_HOST
  delete process.env.SMTP_PORT
  delete process.env.SMTP_SECURE
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  delete process.env.SMTP_FROM
  delete process.env.SMTP_REPLY_TO
  delete process.env.MAILPIT_URL
  delete process.env.MAILPIT_SMTP_PORT
}

function seedStudio(studioId: string): void {
  const now = new Date().toISOString()
  getDrizzle()
    .insert(studios)
    .values({
      id: studioId,
      name: "Mailpit Studio",
      setupStatus: "complete",
      createdAt: now,
      updatedAt: now,
    })
    .run()
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-mailpit-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  process.env.SESSION_SECRET = "mailpit-test-session-secret-value-32"
  process.env.NODE_ENV = "development"
  clearSmtpEnv()
  capturedMessages = []
  setSmtpTransport(mockTransport)
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.includes("/api/v1/info")) {
      return new Response(JSON.stringify({ Version: "1.0" }), { status: 200 })
    }
    return originalFetch(input)
  }
  initDatabase(dbPath)
})

afterEach(() => {
  setSmtpTransport(null)
  globalThis.fetch = originalFetch
  process.env = { ...originalEnv }
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("Mailpit dev helpers", () => {
  it("derives SMTP host and port from MAILPIT_URL", () => {
    assert.equal(resolveMailpitSmtpHost("http://localhost:8025"), "localhost")
    assert.equal(resolveMailpitSmtpPort(), 1025)

    process.env.MAILPIT_SMTP_PORT = "2525"
    assert.equal(resolveMailpitSmtpPort(), 2525)
  })

  it("builds a no-auth Mailpit SMTP connection config", () => {
    const connection = buildMailpitSmtpConnectionConfig("http://127.0.0.1:8025")
    assert.equal(connection.host, "127.0.0.1")
    assert.equal(connection.port, 1025)
    assert.equal(connection.tlsMode, "none")
    assert.equal(connection.username, null)
  })
})

describe("Mailpit dev SMTP routing", () => {
  it("reports Mailpit dev settings when MAILPIT_URL is set", () => {
    process.env.MAILPIT_URL = "http://localhost:8025"

    const studioId = randomUUID()
    seedStudio(studioId)

    const settings = getSmtpSettings(studioId)
    assert.equal(settings.configured, true)
    assert.equal(settings.smtpConfiguredFromEnv, false)
    assert.equal(settings.smtpConfiguredFromMailpitDev, true)
    assert.equal(settings.host, "localhost")
    assert.equal(settings.port, 1025)
    assert.equal(settings.tlsMode, "none")
    assert.equal(settings.passwordConfigured, false)
  })

  it("routes test-send through Mailpit SMTP when MAILPIT_URL is set", async () => {
    process.env.MAILPIT_URL = "http://localhost:8025"

    const studioId = randomUUID()
    seedStudio(studioId)

    const result = await testSmtpDelivery(studioId, "admin@fixture.studio", {})
    assert.equal(result.status, "success")
    assert.equal(capturedMessages.length, 1)
    assert.equal(capturedMessages[0]?.to, "admin@fixture.studio")

    const settings = getSmtpSettings(studioId)
    assert.equal(settings.testVerified, true)
    assert.equal(settings.smtpConfiguredFromMailpitDev, true)
  })

  it("prefers explicit UI SMTP settings over Mailpit dev routing", () => {
    process.env.MAILPIT_URL = "http://localhost:8025"

    const studioId = randomUUID()
    seedStudio(studioId)

    const saved = upsertSmtpSettings(studioId, {
      host: "smtp.fixture.local",
      port: 587,
      password: "smtp-secret",
      fromEmail: "noreply@fixture.studio",
      tlsMode: "starttls",
      instanceUrl: "http://localhost:5173",
    })

    assert.equal(saved.smtpConfiguredFromMailpitDev, false)
    assert.equal(saved.host, "smtp.fixture.local")
  })
})
