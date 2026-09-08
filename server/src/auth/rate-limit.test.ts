import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Request } from "express"
import {
  AUTH_RATE_LIMITS,
  checkRateLimit,
  __testOnly_getClientKey,
  __testOnly_resetRateLimits,
} from "./rate-limit.js"

function mockRequest(overrides: {
  ip?: string
  forwardedFor?: string
}): Request {
  const headers: Record<string, string | undefined> = {}
  if (overrides.forwardedFor !== undefined) {
    headers["x-forwarded-for"] = overrides.forwardedFor
  }

  return {
    ip: overrides.ip,
    header(name: string) {
      return headers[name.toLowerCase()]
    },
  } as unknown as Request
}

afterEach(() => {
  __testOnly_resetRateLimits()
})

describe("rate-limit client key", () => {
  it("uses Express request.ip and does not read X-Forwarded-For directly", () => {
    // When PROXY_HOPS=0, Express leaves request.ip as the socket address even if
    // a client sends a spoofed X-Forwarded-For. Our key must follow request.ip.
    const spoofed = mockRequest({
      ip: "127.0.0.1",
      forwardedFor: "203.0.113.50",
    })
    assert.equal(__testOnly_getClientKey(spoofed), "127.0.0.1")

    // When trust proxy is on, Express sets request.ip from the trusted hop.
    const trusted = mockRequest({
      ip: "198.51.100.10",
      forwardedFor: "198.51.100.10, 10.0.0.2",
    })
    assert.equal(__testOnly_getClientKey(trusted), "198.51.100.10")
  })

  it("buckets by request.ip so spoofed XFF cannot split limits when ip is local", () => {
    const rule = { keyPrefix: "test-xff", maxAttempts: 2, windowMs: 60_000 }

    const a = mockRequest({ ip: "127.0.0.1", forwardedFor: "203.0.113.1" })
    const b = mockRequest({ ip: "127.0.0.1", forwardedFor: "203.0.113.2" })

    assert.equal(checkRateLimit(a, rule).allowed, true)
    assert.equal(checkRateLimit(b, rule).allowed, true)
    assert.equal(checkRateLimit(a, rule).allowed, false)
  })
})

describe("AUTH_RATE_LIMITS", () => {
  it("defines login window used by identity routes", () => {
    assert.equal(AUTH_RATE_LIMITS.login.maxAttempts, 10)
  })
})
