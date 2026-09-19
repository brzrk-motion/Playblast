import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_MAILPIT_SMTP_HOST,
  assertProductionSmtpNotCatcher,
  isEmailCatcherEnabled,
  isSmtpCatcherEndpoint,
  resolveDefaultSmtpHost,
} from "./smtp-catcher.js"

describe("smtp catcher helpers", () => {
  it("treats mailpit host as a catcher endpoint", () => {
    assert.equal(isSmtpCatcherEndpoint("mailpit", 1025), true)
    assert.equal(isSmtpCatcherEndpoint("Mailpit", 587), true)
  })

  it("treats localhost:1025 as a catcher endpoint", () => {
    assert.equal(isSmtpCatcherEndpoint("localhost", 1025), true)
    assert.equal(isSmtpCatcherEndpoint("127.0.0.1", 1025), true)
    assert.equal(isSmtpCatcherEndpoint("::1", 1025), true)
  })

  it("does not treat localhost on other ports as a catcher endpoint", () => {
    assert.equal(isSmtpCatcherEndpoint("localhost", 587), false)
    assert.equal(isSmtpCatcherEndpoint("127.0.0.1", 25), false)
  })

  it("does not treat real relays as catcher endpoints", () => {
    assert.equal(isSmtpCatcherEndpoint("smtp.example.com", 587), false)
  })

  it("defaults SMTP host to mailpit in development when unset", () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousHost = process.env.SMTP_HOST
    const previousCatcher = process.env.PLAYBLAST_EMAIL_CATCHER

    try {
      process.env.NODE_ENV = "development"
      delete process.env.SMTP_HOST
      delete process.env.PLAYBLAST_EMAIL_CATCHER

      assert.equal(resolveDefaultSmtpHost("development"), DEFAULT_MAILPIT_SMTP_HOST)
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousNodeEnv
      if (previousHost === undefined) delete process.env.SMTP_HOST
      else process.env.SMTP_HOST = previousHost
      if (previousCatcher === undefined) delete process.env.PLAYBLAST_EMAIL_CATCHER
      else process.env.PLAYBLAST_EMAIL_CATCHER = previousCatcher
    }
  })

  it("defaults SMTP host to mailpit when PLAYBLAST_EMAIL_CATCHER=mailpit", () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousHost = process.env.SMTP_HOST
    const previousCatcher = process.env.PLAYBLAST_EMAIL_CATCHER

    try {
      process.env.NODE_ENV = "production"
      delete process.env.SMTP_HOST
      process.env.PLAYBLAST_EMAIL_CATCHER = "mailpit"

      assert.equal(isEmailCatcherEnabled("production"), true)
      assert.equal(resolveDefaultSmtpHost("production"), DEFAULT_MAILPIT_SMTP_HOST)
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousNodeEnv
      if (previousHost === undefined) delete process.env.SMTP_HOST
      else process.env.SMTP_HOST = previousHost
      if (previousCatcher === undefined) delete process.env.PLAYBLAST_EMAIL_CATCHER
      else process.env.PLAYBLAST_EMAIL_CATCHER = previousCatcher
    }
  })

  it("does not default SMTP host in production without catcher flag", () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousHost = process.env.SMTP_HOST
    const previousCatcher = process.env.PLAYBLAST_EMAIL_CATCHER

    try {
      process.env.NODE_ENV = "production"
      delete process.env.SMTP_HOST
      delete process.env.PLAYBLAST_EMAIL_CATCHER

      assert.equal(isEmailCatcherEnabled("production"), false)
      assert.equal(resolveDefaultSmtpHost("production"), undefined)
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousNodeEnv
      if (previousHost === undefined) delete process.env.SMTP_HOST
      else process.env.SMTP_HOST = previousHost
      if (previousCatcher === undefined) delete process.env.PLAYBLAST_EMAIL_CATCHER
      else process.env.PLAYBLAST_EMAIL_CATCHER = previousCatcher
    }
  })

  it("refuses production catcher endpoints", () => {
    assert.throws(
      () => assertProductionSmtpNotCatcher("mailpit", 1025),
      /development email catcher/i,
    )
    assert.throws(
      () => assertProductionSmtpNotCatcher("localhost", 1025),
      /development email catcher/i,
    )
    assert.doesNotThrow(() => assertProductionSmtpNotCatcher("smtp.example.com", 587))
  })
})
