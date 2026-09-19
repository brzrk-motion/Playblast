import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { validateStartup } from "./validate-startup.js"

const previousNodeEnv = process.env.NODE_ENV
const previousSessionSecret = process.env.SESSION_SECRET
const previousUploadDir = process.env.UPLOAD_DIR
const previousDbPath = process.env.DB_PATH
const previousEmergencyAuth = process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH
const previousAuthUser = process.env.PLAYBLAST_AUTH_USER
const previousAuthPassword = process.env.PLAYBLAST_AUTH_PASSWORD
const previousSmtpHost = process.env.SMTP_HOST
const previousSmtpPort = process.env.SMTP_PORT
const previousSmtpSecure = process.env.SMTP_SECURE
const previousSmtpUser = process.env.SMTP_USER
const previousSmtpPass = process.env.SMTP_PASS
const previousSmtpFrom = process.env.SMTP_FROM
const previousEmailCatcher = process.env.PLAYBLAST_EMAIL_CATCHER

let tempDir = ""

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-startup-"))
  process.env.NODE_ENV = "production"
  process.env.SESSION_SECRET = "phase-seven-startup-test-secret-32chars"
  process.env.UPLOAD_DIR = path.join(tempDir, "uploads")
  process.env.DB_PATH = path.join(tempDir, "data", "playblast.db")
  delete process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH
  delete process.env.PLAYBLAST_AUTH_USER
  delete process.env.PLAYBLAST_AUTH_PASSWORD
  delete process.env.SMTP_HOST
  delete process.env.SMTP_PORT
  delete process.env.SMTP_SECURE
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  delete process.env.SMTP_FROM
  delete process.env.PLAYBLAST_EMAIL_CATCHER
})

afterEach(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv
  if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = previousSessionSecret
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR
  else process.env.UPLOAD_DIR = previousUploadDir
  if (previousDbPath === undefined) delete process.env.DB_PATH
  else process.env.DB_PATH = previousDbPath
  if (previousEmergencyAuth === undefined) delete process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH
  else process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH = previousEmergencyAuth
  if (previousAuthUser === undefined) delete process.env.PLAYBLAST_AUTH_USER
  else process.env.PLAYBLAST_AUTH_USER = previousAuthUser
  if (previousAuthPassword === undefined) delete process.env.PLAYBLAST_AUTH_PASSWORD
  else process.env.PLAYBLAST_AUTH_PASSWORD = previousAuthPassword
  if (previousSmtpHost === undefined) delete process.env.SMTP_HOST
  else process.env.SMTP_HOST = previousSmtpHost
  if (previousSmtpPort === undefined) delete process.env.SMTP_PORT
  else process.env.SMTP_PORT = previousSmtpPort
  if (previousSmtpSecure === undefined) delete process.env.SMTP_SECURE
  else process.env.SMTP_SECURE = previousSmtpSecure
  if (previousSmtpUser === undefined) delete process.env.SMTP_USER
  else process.env.SMTP_USER = previousSmtpUser
  if (previousSmtpPass === undefined) delete process.env.SMTP_PASS
  else process.env.SMTP_PASS = previousSmtpPass
  if (previousSmtpFrom === undefined) delete process.env.SMTP_FROM
  else process.env.SMTP_FROM = previousSmtpFrom
  if (previousEmailCatcher === undefined) delete process.env.PLAYBLAST_EMAIL_CATCHER
  else process.env.PLAYBLAST_EMAIL_CATCHER = previousEmailCatcher
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("validateStartup", () => {
  it("passes with valid production configuration", () => {
    const result = validateStartup()
    assert.deepEqual(result, { ok: true })
  })

  it("fails when SESSION_SECRET is missing in production", () => {
    delete process.env.SESSION_SECRET
    const result = validateStartup()
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.code, "SESSION_SECRET_INVALID")
    }
  })

  it("fails when emergency Basic Auth is enabled without credentials", () => {
    process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH = "true"
    const result = validateStartup()
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.code, "EMERGENCY_BASIC_AUTH_INCOMPLETE")
    }
  })

  it("fails when production SMTP points at Mailpit", () => {
    process.env.SMTP_HOST = "mailpit"
    process.env.SMTP_PORT = "1025"
    process.env.SMTP_SECURE = "false"
    process.env.SMTP_USER = "dev"
    process.env.SMTP_PASS = "dev"
    process.env.SMTP_FROM = "noreply@example.com"

    const result = validateStartup()
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.code, "SMTP_CATCHER_FORBIDDEN")
    }
  })

  it("fails when PLAYBLAST_EMAIL_CATCHER is enabled in production", () => {
    process.env.PLAYBLAST_EMAIL_CATCHER = "mailpit"
    const result = validateStartup()
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.code, "SMTP_CATCHER_FORBIDDEN")
    }
  })
})
