import type { SmtpSettingsResponse } from "./team-contracts.js"

export const SMTP_STATUS_VALUES = [
  "not_configured",
  "saved_not_tested",
  "verified",
  "failed",
] as const

export type SmtpStatus = (typeof SMTP_STATUS_VALUES)[number]

export interface SmtpStatusPresentation {
  status: SmtpStatus
  label: string
  nextAction: string
  lastError: string | null
}

export function getSmtpStatusPresentation(
  smtp: SmtpSettingsResponse | null | undefined,
): SmtpStatusPresentation {
  if (!smtp?.configured) {
    return {
      status: "not_configured",
      label: "Not configured",
      nextAction: "Save SMTP settings",
      lastError: null,
    }
  }

  if (smtp.testVerified) {
    return {
      status: "verified",
      label: "Verified",
      nextAction: "Invite team members",
      lastError: null,
    }
  }

  if (smtp.lastTestStatus === "failed") {
    return {
      status: "failed",
      label: "Failed",
      nextAction: "Send a test email",
      lastError: smtp.lastTestError,
    }
  }

  return {
    status: "saved_not_tested",
    label: "Saved, not tested",
    nextAction: "Send a test email",
    lastError: null,
  }
}

export const INVITE_DISABLED_REASON = "SMTP test required"
