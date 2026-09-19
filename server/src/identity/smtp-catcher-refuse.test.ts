import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { getDrizzle } from "../db/drizzle.js"
import { studios } from "../db/schema/identity.js"
import { initDatabase, closeDatabase } from "../storage/db.js"
import {
  sendSmtpMessage,
  SmtpServiceError,
  testSmtpDelivery,
  upsertSmtpSettings,
} from "./smtp-service.js"
import { setSmtpTransport } from "./smtp-transport.js"

const originalEnv = { ...process.env }

let tempDir = ""
let dbPath = ""

function seedStudio(studioId: string): void {
  const now = new Date().toISOString()
  getDrizzle()
    .insert(studios)
    .values({
      id: studioId,
      name: "Catcher Studio",
      setupStatus: "complete",
      createdAt: now,
      updatedAt: now,
    })
    .run()
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-smtp-catcher-refuse-"))
  dbPath = path.join(tempDir, "test.db")
  process.env = {
    ...originalEnv,
    NODE_ENV: "production",
    DB_PATH: dbPath,
    SESSION_SECRET: "smtp-catcher-refuse-test-secret-32chars",
  }
  delete process.env.SMTP_HOST
  delete process.env.SMTP_PORT
  delete process.env.SMTP_SECURE
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  delete process.env.SMTP_FROM
  delete process.env.PLAYBLAST_EMAIL_CATCHER
  initDatabase(dbPath)
})

afterEach(() => {
  setSmtpTransport(null)
  process.env = { ...originalEnv }
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("production SMTP catcher refusal", () => {
  it("blocks UI SMTP configuration that points at Mailpit", () => {
    const studioId = randomUUID()
    seedStudio(studioId)

    assert.throws(
      () =>
        upsertSmtpSettings(studioId, {
          host: "mailpit",
          port: 1025,
          password: "dev",
          fromEmail: "noreply@example.com",
          tlsMode: "none",
          instanceUrl: "https://playblast.fixture.studio",
        }),
      (error: unknown) =>
        error instanceof SmtpServiceError && error.code === "VALIDATION_FAILED",
    )
  })

  it("blocks send when stored SMTP points at localhost:1025", async () => {
    process.env.NODE_ENV = "development"
    const studioId = randomUUID()
    seedStudio(studioId)

    upsertSmtpSettings(studioId, {
      host: "localhost",
      port: 1025,
      password: "dev",
      fromEmail: "noreply@example.com",
      tlsMode: "none",
      instanceUrl: "https://playblast.fixture.studio",
    })

    process.env.NODE_ENV = "production"

    const result = await sendSmtpMessage(studioId, {
      to: "member@example.com",
      subject: "Invite",
      text: "Accept invite",
      html: "<p>Accept invite</p>",
    })

    assert.equal(result.success, false)
    if (!result.success) {
      assert.match(result.error, /development email catcher/i)
    }
  })

  it("blocks SMTP test delivery to localhost:1025 in production", async () => {
    process.env.NODE_ENV = "development"
    const studioId = randomUUID()
    seedStudio(studioId)

    upsertSmtpSettings(studioId, {
      host: "127.0.0.1",
      port: 1025,
      password: "dev",
      fromEmail: "noreply@example.com",
      tlsMode: "none",
      instanceUrl: "https://playblast.fixture.studio",
    })

    process.env.NODE_ENV = "production"

    await assert.rejects(
      () => testSmtpDelivery(studioId, "admin@example.com", {}),
      (error: unknown) =>
        error instanceof SmtpServiceError && error.code === "VALIDATION_FAILED",
    )
  })
})
