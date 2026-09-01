import type { InvitableRole } from "./bootstrap.js"
import type { InvitationSummary } from "./identity.js"
import type { UserRole } from "./roles.js"

/** Invitation lifetime in hours (7 days). */
export const INVITE_EXPIRY_HOURS = 168

export const SMTP_TLS_MODES = ["none", "starttls", "tls"] as const
export type SmtpTlsMode = (typeof SMTP_TLS_MODES)[number]

export const SMTP_TEST_STATUSES = ["never", "success", "failed"] as const
export type SmtpTestStatus = (typeof SMTP_TEST_STATUSES)[number]

/** SMTP settings returned by GET /api/smtp (password never included). */
export interface SmtpSettingsResponse {
  configured: boolean
  host: string | null
  port: number | null
  username: string | null
  fromEmail: string | null
  tlsMode: SmtpTlsMode | null
  instanceUrl: string | null
  passwordConfigured: boolean
  testVerified: boolean
  lastTestStatus: SmtpTestStatus
  lastTestAt: string | null
  lastTestError: string | null
}

export interface UpdateSmtpSettingsRequest {
  host: string
  port: number
  username?: string
  password?: string
  fromEmail: string
  tlsMode: SmtpTlsMode
  instanceUrl: string
}

export interface TestSmtpRequest {
  recipientEmail?: string
}

export interface TestSmtpResponse {
  status: "success" | "failed"
  testedAt: string
  error?: string
}

export interface CreateInvitationRequest {
  name: string
  email: string
  role: InvitableRole
}

export interface InvitationCreatedResponse extends InvitationSummary {
  deliveryStatus: "sent" | "failed"
}

export interface InvitePreviewResponse {
  studioName: string
  email: string
  name: string
  role: InvitableRole
  expiresAt: string
}

export interface AcceptInvitationRequest {
  password: string
  confirmPassword: string
}

export interface UpdateUserRequest {
  role?: UserRole
  disabled?: boolean
}

/** Captured outbound email for tests (no secrets). */
export interface CapturedInviteEmail {
  to: string
  subject: string
  text: string
  html: string
}
