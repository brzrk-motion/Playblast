import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import type { SmtpTlsMode } from "@playblast/shared"
import { isE2ETestRuntime } from "../e2e-runtime.js"

export interface OutboundEmail {
  to: string
  subject: string
  text: string
  html: string
}

export interface SmtpConnectionConfig {
  host: string
  port: number
  username: string | null
  password: string
  fromEmail: string
  tlsMode: SmtpTlsMode
  timeoutMs: number
}

export interface SmtpSendResult {
  accepted: boolean
  errorMessage?: string
}

export interface SmtpTransport {
  send(config: SmtpConnectionConfig, message: OutboundEmail): Promise<SmtpSendResult>
}

const DEFAULT_TIMEOUT_MS = 30_000

function sanitizeSmtpError(message: string): string {
  return message
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/(password|auth|credential)[^\s]*/gi, "[redacted]")
    .slice(0, 240)
}

let activeTransport: SmtpTransport | null = null

export function setSmtpTransport(transport: SmtpTransport | null): void {
  activeTransport = transport
}

/** E2E-only transport. The explicit test-mode guard prevents production misconfiguration. */
function createCaptureTransport(captureDir: string): SmtpTransport {
  const resolved = path.resolve(captureDir)
  return {
    async send(_config, message) {
      fs.mkdirSync(resolved, { recursive: true })
      const filename = `${Date.now()}-${randomUUID()}.json`
      fs.writeFileSync(
        path.join(resolved, filename),
        JSON.stringify(
          {
            ...message,
            capturedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      )
      return { accepted: true }
    },
  }
}

export function getSmtpTransport(): SmtpTransport {
  if (activeTransport) {
    return activeTransport
  }

  const captureDir = process.env.PLAYBLAST_SMTP_CAPTURE_DIR?.trim()
  if (
    captureDir &&
    isE2ETestRuntime() &&
    process.env.PLAYBLAST_E2E_TEST_MODE === "1"
  ) {
    return createCaptureTransport(captureDir)
  }

  return nodemailerTransport
}

const nodemailerTransport: SmtpTransport = {
  async send(config, message) {
    const nodemailer = await import("nodemailer")

    const secure = config.tlsMode === "tls"
    const requireTLS = config.tlsMode === "starttls"

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure,
      requireTLS,
      auth: config.username
        ? {
            user: config.username,
            pass: config.password,
          }
        : undefined,
      connectionTimeout: config.timeoutMs,
      greetingTimeout: config.timeoutMs,
      socketTimeout: config.timeoutMs,
      tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
      },
    })

    try {
      await transporter.sendMail({
        from: config.fromEmail,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
      return { accepted: true }
    } catch (error) {
      const raw = error instanceof Error ? error.message : "SMTP delivery failed."
      return {
        accepted: false,
        errorMessage: sanitizeSmtpError(raw),
      }
    } finally {
      transporter.close()
    }
  },
}

export const SMTP_DEFAULT_TIMEOUT_MS = DEFAULT_TIMEOUT_MS
