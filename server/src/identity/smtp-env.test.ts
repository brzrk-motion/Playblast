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
  getSmtpSettings,
  SmtpServiceError,
  upsertSmtpSettings,
} from "./smtp-service.js"

const originalEnv = { ...process.env }

const COMPLETE_SMTP_ENV = {
  SMTP_HOST: "env-smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "env-user",
  SMTP_PASS: "env-pass",
  SMTP_FROM: "env@example.com",
} as const

let tempDir = ""
let dbPath = ""

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

function seedStudio(studioId: string): void {
  const now = new Date().toISOString()
  getDrizzle()
    .insert(studios)
    .values({
      id: studioId,
      name: "Env Studio",
      setupStatus: "complete",
      createdAt: now,
      updatedAt: now,
    })
    .run()
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-smtp-env-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  process.env.SESSION_SECRET = "smtp-env-test-session-secret-value-32"
  initDatabase(dbPath)
})

afterEach(() => {
  process.env = { ...originalEnv }
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("SMTP env precedence", () => {
  it("reports env-preconfigured SMTP through getSmtpSettings", () => {
    clearSmtpEnv()
    Object.assign(process.env, COMPLETE_SMTP_ENV)

    const studioId = randomUUID()
    seedStudio(studioId)

    const settings = getSmtpSettings(studioId)
    assert.equal(settings.configured, true)
    assert.equal(settings.smtpConfiguredFromEnv, true)
    assert.equal(settings.host, "env-smtp.example.com")
    assert.equal(settings.port, 587)
    assert.equal(settings.username, "env-user")
    assert.equal(settings.fromEmail, "env@example.com")
    assert.equal(settings.tlsMode, "starttls")
    assert.equal(settings.passwordConfigured, true)
    assert.equal(settings.testVerified, false)
    assert.equal(settings.lastTestStatus, "never")
  })

  it("prefers env SMTP values over stored UI settings", () => {
    clearSmtpEnv()
    Object.assign(process.env, COMPLETE_SMTP_ENV)

    const studioId = randomUUID()
    seedStudio(studioId)
    const now = new Date().toISOString()
    getDrizzle()
      .insert(studioSmtpSettings)
      .values({
        studioId,
        host: "ui-smtp.example.com",
        port: 465,
        username: "ui-user",
        passwordEncrypted: "encrypted",
        fromEmail: "ui@example.com",
        tlsMode: "tls",
        instanceUrl: "https://playblast.fixture.studio",
        testVerifiedAt: now,
        lastTestStatus: "success",
        lastTestAt: now,
        lastTestError: null,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    const settings = getSmtpSettings(studioId)
    assert.equal(settings.smtpConfiguredFromEnv, true)
    assert.equal(settings.host, "env-smtp.example.com")
    assert.equal(settings.instanceUrl, "https://playblast.fixture.studio")
  })

  it("blocks UI SMTP updates when env SMTP is complete", () => {
    clearSmtpEnv()
    Object.assign(process.env, COMPLETE_SMTP_ENV)

    const studioId = randomUUID()
    seedStudio(studioId)

    assert.throws(
      () =>
        upsertSmtpSettings(studioId, {
          host: "ui-smtp.example.com",
          port: 587,
          password: "ui-password",
          fromEmail: "ui@example.com",
          tlsMode: "starttls",
          instanceUrl: "https://playblast.fixture.studio",
        }),
      (error: unknown) =>
        error instanceof SmtpServiceError && error.code === "FORBIDDEN",
    )
  })

  it("allows UI SMTP configuration when env SMTP is incomplete", () => {
    clearSmtpEnv()

    const studioId = randomUUID()
    seedStudio(studioId)

    const settings = upsertSmtpSettings(studioId, {
      host: "ui-smtp.example.com",
      port: 587,
      password: "ui-password",
      fromEmail: "ui@example.com",
      tlsMode: "starttls",
      instanceUrl: "https://playblast.fixture.studio",
    })

    assert.equal(settings.configured, true)
    assert.equal(settings.smtpConfiguredFromEnv, false)
    assert.equal(settings.host, "ui-smtp.example.com")
  })
})
