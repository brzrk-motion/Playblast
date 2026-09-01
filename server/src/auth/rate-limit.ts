import type { Request } from "express"

interface RateLimitBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()

export interface RateLimitRule {
  keyPrefix: string
  maxAttempts: number
  windowMs: number
}

export const AUTH_RATE_LIMITS = {
  login: { keyPrefix: "login", maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  setup: { keyPrefix: "setup", maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  recovery: { keyPrefix: "recovery", maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  passwordChange: {
    keyPrefix: "password-change",
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
  },
  invite: { keyPrefix: "invite", maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  inviteAccept: {
    keyPrefix: "invite-accept",
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
  },
  smtpTest: { keyPrefix: "smtp-test", maxAttempts: 5, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>

function getClientKey(request: Request): string {
  const forwarded = request.header("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || request.ip || "unknown"
  }

  return request.ip || "unknown"
}

export function checkRateLimit(
  request: Request,
  rule: RateLimitRule,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const key = `${rule.keyPrefix}:${getClientKey(request)}`
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs })
    return { allowed: true }
  }

  if (existing.count >= rule.maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { allowed: true }
}

/** @internal Reset in-memory buckets between tests. */
export function __testOnly_resetRateLimits(): void {
  buckets.clear()
}
