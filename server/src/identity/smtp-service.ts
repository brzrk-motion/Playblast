import type {
  CapturedInviteEmail,
  InvitableRole,
  SmtpSettingsResponse,
  SmtpTestStatus,
  SmtpTlsMode,
  TestSmtpRequest,
  TestSmtpResponse,
  UpdateSmtpSettingsRequest,
} from "@playblast/shared"
import { eq } from "drizzle-orm"
import { getDrizzle } from "../db/drizzle.js"
import { studioSmtpSettings } from "../db/schema/identity.js"
import { decryptSecret, encryptSecret } from "./secret-crypto.js"
import {
  getSmtpTransport,
  SMTP_DEFAULT_TIMEOUT_MS,
  type OutboundEmail,
  type SmtpConnectionConfig,
} from "./smtp-transport.js"

export class SmtpServiceError extends Error {
  constructor(
    readonly code:
      | "VALIDATION_FAILED"
      | "FORBIDDEN"
      | "DELIVERY_FAILED"
      | "NOT_FOUND",
    readonly message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "SmtpServiceError"
  }
}

function emptySettings(): SmtpSettingsResponse {
  return {
    configured: false,
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
  }
}

function mapRow(row: typeof studioSmtpSettings.$inferSelect): SmtpSettingsResponse {
  return {
    configured: true,
    host: row.host,
    port: row.port,
    username: row.username,
    fromEmail: row.fromEmail,
    tlsMode: row.tlsMode,
    instanceUrl: row.instanceUrl,
    passwordConfigured: Boolean(row.passwordEncrypted),
    testVerified: Boolean(row.testVerifiedAt),
    lastTestStatus: row.lastTestStatus as SmtpTestStatus,
    lastTestAt: row.lastTestAt,
    lastTestError: row.lastTestError,
  }
}

function validateTlsMode(value: string): value is SmtpTlsMode {
  return value === "none" || value === "starttls" || value === "tls"
}

function validateSmtpInput(input: UpdateSmtpSettingsRequest): Record<string, string[]> {
  const details: Record<string, string[]> = {}

  if (!input.host?.trim()) {
    details.host = ["SMTP host is required."]
  }

  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
    details.port = ["Enter a valid SMTP port."]
  }

  if (!input.fromEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.fromEmail)) {
    details.fromEmail = ["Enter a valid sender email address."]
  }

  if (!validateTlsMode(input.tlsMode)) {
    details.tlsMode = ["TLS mode must be none, starttls, or tls."]
  }

  try {
    const parsed = new URL(input.instanceUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      details.instanceUrl = ["Instance URL must use http or https."]
    }
  } catch {
    details.instanceUrl = ["Enter a valid instance URL."]
  }

  return details
}

export function getSmtpSettings(studioId: string): SmtpSettingsResponse {
  const db = getDrizzle()
  const row = db
    .select()
    .from(studioSmtpSettings)
    .where(eq(studioSmtpSettings.studioId, studioId))
    .get()

  if (!row) {
    return emptySettings()
  }

  return mapRow(row)
}

export function upsertSmtpSettings(
  studioId: string,
  input: UpdateSmtpSettingsRequest,
  existingPassword?: string,
): SmtpSettingsResponse {
  const details = validateSmtpInput(input)
  const password = input.password?.trim()

  if (!password && !existingPassword) {
    details.password = ["SMTP password is required for initial configuration."]
  }

  if (Object.keys(details).length > 0) {
    throw new SmtpServiceError("VALIDATION_FAILED", "Validation failed.", details)
  }

  const db = getDrizzle()
  const now = new Date().toISOString()
  const current = db
    .select()
    .from(studioSmtpSettings)
    .where(eq(studioSmtpSettings.studioId, studioId))
    .get()

  const encryptedPassword = encryptSecret(password || existingPassword!)

  if (current) {
    db.update(studioSmtpSettings)
      .set({
        host: input.host.trim(),
        port: input.port,
        username: input.username?.trim() || null,
        passwordEncrypted: encryptedPassword,
        fromEmail: input.fromEmail.trim(),
        tlsMode: input.tlsMode,
        instanceUrl: input.instanceUrl.replace(/\/$/, ""),
        testVerifiedAt: null,
        lastTestStatus: "never",
        lastTestAt: null,
        lastTestError: null,
        updatedAt: now,
      })
      .where(eq(studioSmtpSettings.studioId, studioId))
      .run()
  } else {
    db.insert(studioSmtpSettings)
      .values({
        studioId,
        host: input.host.trim(),
        port: input.port,
        username: input.username?.trim() || null,
        passwordEncrypted: encryptedPassword,
        fromEmail: input.fromEmail.trim(),
        tlsMode: input.tlsMode,
        instanceUrl: input.instanceUrl.replace(/\/$/, ""),
        testVerifiedAt: null,
        lastTestStatus: "never",
        lastTestAt: null,
        lastTestError: null,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  return getSmtpSettings(studioId)
}

function buildConnectionConfig(
  row: typeof studioSmtpSettings.$inferSelect,
): SmtpConnectionConfig {
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    password: decryptSecret(row.passwordEncrypted),
    fromEmail: row.fromEmail,
    tlsMode: row.tlsMode,
    timeoutMs: SMTP_DEFAULT_TIMEOUT_MS,
  }
}

export async function sendSmtpMessage(
  studioId: string,
  message: OutboundEmail,
): Promise<{ success: true } | { success: false; error: string }> {
  const db = getDrizzle()
  const row = db
    .select()
    .from(studioSmtpSettings)
    .where(eq(studioSmtpSettings.studioId, studioId))
    .get()

  if (!row) {
    return { success: false, error: "SMTP is not configured." }
  }

  const transport = getSmtpTransport()
  const result = await transport.send(buildConnectionConfig(row), message)

  if (!result.accepted) {
    return {
      success: false,
      error: result.errorMessage ?? "SMTP delivery failed.",
    }
  }

  return { success: true }
}

export async function testSmtpDelivery(
  studioId: string,
  adminEmail: string,
  input: TestSmtpRequest,
): Promise<TestSmtpResponse> {
  const recipient = input.recipientEmail?.trim() || adminEmail
  const testedAt = new Date().toISOString()
  const db = getDrizzle()
  const row = db
    .select()
    .from(studioSmtpSettings)
    .where(eq(studioSmtpSettings.studioId, studioId))
    .get()

  if (!row) {
    throw new SmtpServiceError("NOT_FOUND", "SMTP is not configured.")
  }

  const message: OutboundEmail = {
    to: recipient,
    subject: "Playblast SMTP test",
    text: [
      "This is a test message from your self-hosted Playblast instance.",
      "If you received this email, SMTP delivery is working.",
    ].join("\n"),
    html: [
      "<p>This is a test message from your self-hosted Playblast instance.</p>",
      "<p>If you received this email, SMTP delivery is working.</p>",
    ].join(""),
  }

  const transport = getSmtpTransport()
  const result = await transport.send(buildConnectionConfig(row), message)

  if (result.accepted) {
    db.update(studioSmtpSettings)
      .set({
        testVerifiedAt: testedAt,
        lastTestStatus: "success",
        lastTestAt: testedAt,
        lastTestError: null,
        updatedAt: testedAt,
      })
      .where(eq(studioSmtpSettings.studioId, studioId))
      .run()

    return { status: "success", testedAt }
  }

  const error = result.errorMessage ?? "SMTP delivery failed."
  db.update(studioSmtpSettings)
    .set({
      testVerifiedAt: null,
      lastTestStatus: "failed",
      lastTestAt: testedAt,
      lastTestError: error,
      updatedAt: testedAt,
    })
    .where(eq(studioSmtpSettings.studioId, studioId))
    .run()

  throw new SmtpServiceError("DELIVERY_FAILED", error)
}

export function requireVerifiedSmtp(studioId: string): void {
  const settings = getSmtpSettings(studioId)
  if (!settings.configured || !settings.testVerified) {
    throw new SmtpServiceError(
      "VALIDATION_FAILED",
      "SMTP must be configured and pass a test delivery before sending invitations.",
      {
        smtp: ["Run a successful SMTP test before inviting users."],
      },
    )
  }
}

export function buildInviteEmailContent(input: {
  studioName: string
  recipientName: string
  recipientEmail: string
  role: InvitableRole
  instanceUrl: string
  inviteUrl: string
  expiresAt: string
}): OutboundEmail {
  const roleLabel = input.role === "creative" ? "Creative" : "Proofing"
  const expiryLabel = new Date(input.expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const text = [
    `Hello ${input.recipientName},`,
    "",
    `${input.studioName} invited you to join their self-hosted Playblast instance as ${roleLabel}.`,
    "",
    `Email: ${input.recipientEmail}`,
    `Role: ${roleLabel}`,
    `Instance: ${input.instanceUrl}`,
    `Expires: ${expiryLabel}`,
    "",
    `Accept your invitation: ${input.inviteUrl}`,
    "",
    "This Playblast instance is operated by your studio, not by BRZRK or a centralized host.",
    "If you did not expect this invitation, you can ignore this email.",
  ].join("\n")

  const html = [
    `<p>Hello ${escapeHtml(input.recipientName)},</p>`,
    `<p><strong>${escapeHtml(input.studioName)}</strong> invited you to join their self-hosted Playblast instance as <strong>${roleLabel}</strong>.</p>`,
    "<ul>",
    `<li>Email: ${escapeHtml(input.recipientEmail)}</li>`,
    `<li>Role: ${roleLabel}</li>`,
    `<li>Instance: <a href="${escapeHtml(input.instanceUrl)}">${escapeHtml(input.instanceUrl)}</a></li>`,
    `<li>Expires: ${escapeHtml(expiryLabel)}</li>`,
    "</ul>",
    `<p><a href="${escapeHtml(input.inviteUrl)}">Accept your invitation</a></p>`,
    "<p><em>This Playblast instance is operated by your studio, not by BRZRK or a centralized host.</em></p>",
    "<p>If you did not expect this invitation, you can ignore this email.</p>",
  ].join("")

  return {
    to: input.recipientEmail,
    subject: `${input.studioName} invited you to Playblast`,
    text,
    html,
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

/** @internal Test helper to parse captured invite emails. */
export function __testOnly_parseCapturedInvite(
  message: OutboundEmail,
): CapturedInviteEmail {
  return {
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  }
}
