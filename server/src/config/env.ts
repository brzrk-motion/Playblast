import path from "node:path"
import { loadEnvFile } from "node:process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "../../..")

try {
  loadEnvFile(path.join(REPO_ROOT, ".env"))
} catch {
  // Optional in production when Compose or the host injects variables.
}

const DEFAULT_PORT = 3000
const DEFAULT_HOST = "0.0.0.0"
const DEFAULT_UPLOAD_DIR = "/app/uploads"
const DEFAULT_DB_PATH = "/app/data/playblast.db"
const DEFAULT_MAX_UPLOAD_SIZE_MB = 5000

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`)
  }

  return port
}

function parseMaxUploadSizeMb(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback
  }

  const sizeMb = Number(value)
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) {
    throw new Error(`Invalid MAX_UPLOAD_SIZE value: ${value}`)
  }

  return sizeMb
}

function parseHost(value: string | undefined, fallback: string): string {
  if (value === undefined || value === "") {
    return fallback
  }

  const host = value.trim()
  if (host.length === 0) {
    throw new Error(`Invalid HOST value: ${value}`)
  }

  return host
}

function parseProxyHops(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback
  }

  const hops = Number(value)
  if (!Number.isInteger(hops) || hops < 0 || hops > 32) {
    throw new Error(`Invalid PROXY_HOPS value: ${value}`)
  }

  return hops
}

function parseNodeEnv(value: string | undefined): "production" | "development" {
  if (value === undefined || value === "") {
    return "development"
  }

  if (value === "production" || value === "development") {
    return value
  }

  throw new Error(`Invalid NODE_ENV value: ${value}`)
}

const REQUIRED_SMTP_ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const

function isNonEmptyEnv(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== ""
}

function isSmtpEnvComplete(): boolean {
  return REQUIRED_SMTP_ENV_KEYS.every((key) => isNonEmptyEnv(process.env[key]))
}

function parseSmtpPort(value: string): number {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid SMTP_PORT value: ${value}`)
  }

  return port
}

function parseSmtpSecure(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (normalized === "true" || normalized === "1") {
    return true
  }
  if (normalized === "false" || normalized === "0") {
    return false
  }

  throw new Error(`Invalid SMTP_SECURE value: ${value}`)
}

export type SmtpEnvConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  replyTo?: string
}

function resolveSmtpFromEnv(): SmtpEnvConfig | null {
  if (!isSmtpEnvComplete()) {
    return null
  }

  const replyTo = process.env.SMTP_REPLY_TO
  return {
    host: process.env.SMTP_HOST!.trim(),
    port: parseSmtpPort(process.env.SMTP_PORT!.trim()),
    secure: parseSmtpSecure(process.env.SMTP_SECURE!),
    user: process.env.SMTP_USER!.trim(),
    pass: process.env.SMTP_PASS!,
    from: process.env.SMTP_FROM!.trim(),
    ...(isNonEmptyEnv(replyTo) ? { replyTo: replyTo.trim() } : {}),
  }
}

function resolveMailpitUrl(nodeEnv: "production" | "development"): string | undefined {
  if (nodeEnv === "production") {
    return undefined
  }

  const mailpitUrl = process.env.MAILPIT_URL
  if (!isNonEmptyEnv(mailpitUrl)) {
    return undefined
  }

  return mailpitUrl.trim()
}

export const config = {
  get port(): number {
    return parsePort(process.env.PORT, DEFAULT_PORT)
  },
  get host(): string {
    return parseHost(process.env.HOST, DEFAULT_HOST)
  },
  get uploadDir(): string {
    return path.resolve(process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR)
  },
  get dbPath(): string {
    return path.resolve(process.env.DB_PATH ?? DEFAULT_DB_PATH)
  },
  get maxUploadSizeMb(): number {
    return parseMaxUploadSizeMb(
      process.env.MAX_UPLOAD_SIZE,
      DEFAULT_MAX_UPLOAD_SIZE_MB,
    )
  },
  get nodeEnv(): "production" | "development" {
    return parseNodeEnv(process.env.NODE_ENV)
  },
  /**
   * Number of trusted reverse-proxy hops in front of Express.
   * Default 0 (do not trust X-Forwarded-* from clients).
   * Use 1 with docker-compose.proxy.yml (Caddy/nginx on the compose network).
   */
  get proxyHops(): number {
    return parseProxyHops(process.env.PROXY_HOPS, 0)
  },
  get smtpConfiguredFromEnv(): boolean {
    return isSmtpEnvComplete()
  },
  get smtpFromEnv(): SmtpEnvConfig | null {
    return resolveSmtpFromEnv()
  },
  get mailpitUrl(): string | undefined {
    return resolveMailpitUrl(this.nodeEnv)
  },
}

export function getMaxUploadSizeBytes(): number {
  return config.maxUploadSizeMb * 1024 * 1024
}

export const isProduction = (): boolean => config.nodeEnv === "production"
