import { createHash, timingSafeEqual } from "node:crypto"
import { isProduction } from "../config/env.js"

const DEFAULT_SESSION_TTL_HOURS = 168
const MIN_SESSION_SECRET_LENGTH = 32

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric configuration value: ${value}`)
  }

  return parsed
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") {
    return fallback
  }

  if (value === "true" || value === "1") {
    return true
  }

  if (value === "false" || value === "0") {
    return false
  }

  throw new Error(`Invalid boolean configuration value: ${value}`)
}

export const authConfig = {
  get sessionSecret(): string {
    const secret = process.env.SESSION_SECRET
    if (!secret) {
      if (isProduction()) {
        throw new Error("SESSION_SECRET is required in production")
      }
      return "playblast-dev-session-secret-not-for-production"
    }

    if (secret.length < MIN_SESSION_SECRET_LENGTH) {
      throw new Error(
        `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`,
      )
    }

    return secret
  },
  get sessionTtlHours(): number {
    return parsePositiveInt(process.env.SESSION_TTL_HOURS, DEFAULT_SESSION_TTL_HOURS)
  },
  get sessionTtlMs(): number {
    return authConfig.sessionTtlHours * 60 * 60 * 1000
  },
  get emergencyBasicAuthEnabled(): boolean {
    return parseBoolean(process.env.PLAYBLAST_EMERGENCY_BASIC_AUTH, false)
  },
  get emergencyBasicAuthUser(): string | undefined {
    return process.env.PLAYBLAST_AUTH_USER
  },
  get emergencyBasicAuthPassword(): string | undefined {
    return process.env.PLAYBLAST_AUTH_PASSWORD
  },
  verifyAdminRecoveryToken(token: string): boolean {
    const configured = process.env.PLAYBLAST_ADMIN_RECOVERY_TOKEN
    if (!configured) {
      return false
    }

    const supplied = createHash("sha256").update(token).digest()
    const expected = createHash("sha256").update(configured).digest()
    return timingSafeEqual(supplied, expected)
  },
  cookieNames: {
    session: "playblast_session",
    csrf: "playblast_csrf",
  },
} as const
