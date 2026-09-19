import { describe, it } from "node:test"
import assert from "node:assert/strict"
import type { SmtpSettingsResponse } from "./team-contracts.js"
import { getSmtpStatusPresentation } from "./smtp-status.js"

function smtp(overrides: Partial<SmtpSettingsResponse> = {}): SmtpSettingsResponse {
  return {
    configured: false,
    smtpConfiguredFromEnv: false,
    smtpConfiguredFromMailpitDev: false,
    host: null,
    port: null,
    username: null,
    fromEmail: null,
    tlsMode: null,
    instanceUrl: null,
    passwordConfigured: false,
    testVerified: false,
    lastTestStatus: "never",
    lastTestAt: null,
    lastTestError: null,
    ...overrides,
  }
}

describe("getSmtpStatusPresentation", () => {
  it("returns not configured when SMTP is absent", () => {
    const presentation = getSmtpStatusPresentation(null)
    assert.equal(presentation.status, "not_configured")
    assert.equal(presentation.label, "Not configured")
    assert.equal(presentation.nextAction, "Save SMTP settings")
  })

  it("returns saved, not tested after settings are saved", () => {
    const presentation = getSmtpStatusPresentation(
      smtp({
        configured: true,
        host: "smtp.example.com",
        port: 587,
        fromEmail: "noreply@example.com",
        tlsMode: "starttls",
        instanceUrl: "https://playblast.example.com",
        passwordConfigured: true,
      }),
    )
    assert.equal(presentation.status, "saved_not_tested")
    assert.equal(presentation.label, "Saved, not tested")
    assert.equal(presentation.nextAction, "Send a test email")
  })

  it("returns verified after a successful SMTP test", () => {
    const presentation = getSmtpStatusPresentation(
      smtp({
        configured: true,
        testVerified: true,
        lastTestStatus: "success",
      }),
    )
    assert.equal(presentation.status, "verified")
    assert.equal(presentation.label, "Verified")
    assert.equal(presentation.nextAction, "Invite team members")
  })

  it("returns failed with the last error when the SMTP test fails", () => {
    const presentation = getSmtpStatusPresentation(
      smtp({
        configured: true,
        testVerified: false,
        lastTestStatus: "failed",
        lastTestError: "Connection refused",
      }),
    )
    assert.equal(presentation.status, "failed")
    assert.equal(presentation.label, "Failed")
    assert.equal(presentation.nextAction, "Send a test email")
    assert.equal(presentation.lastError, "Connection refused")
  })
})
