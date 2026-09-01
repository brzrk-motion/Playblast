import { createHash, timingSafeEqual } from "node:crypto"
import type { NextFunction, Request, Response } from "express"
import { authConfig } from "../auth/config.js"
import { getSetupStatusResponse } from "../identity/repository.js"
import { isProduction } from "../config/env.js"

type Credentials = {
  username: string
  password: string
}

function readEmergencyCredentials(): Credentials | null {
  if (!authConfig.emergencyBasicAuthEnabled) {
    return null
  }

  const username = authConfig.emergencyBasicAuthUser
  const password = authConfig.emergencyBasicAuthPassword

  if (!username || !password) {
    if (isProduction()) {
      throw new Error(
        "PLAYBLAST_EMERGENCY_BASIC_AUTH requires PLAYBLAST_AUTH_USER and PLAYBLAST_AUTH_PASSWORD",
      )
    }
    return null
  }

  return { username, password }
}

function credentialDigest(username: string, password: string): Buffer {
  return createHash("sha256")
    .update(username)
    .update("\0")
    .update(password)
    .digest()
}

function hasValidCredentials(request: Request, expected: Credentials): boolean {
  const header = request.header("authorization")
  if (!header || !/^Basic /i.test(header)) {
    return false
  }

  let decoded: string
  try {
    decoded = Buffer.from(header.slice("Basic ".length), "base64").toString(
      "utf8",
    )
  } catch {
    return false
  }

  const separator = decoded.indexOf(":")
  if (separator < 0) {
    return false
  }

  const supplied = credentialDigest(
    decoded.slice(0, separator),
    decoded.slice(separator + 1),
  )
  return timingSafeEqual(supplied, credentialDigest(expected.username, expected.password))
}

function isEmergencyBootstrapPath(request: Request): boolean {
  const path = request.path
  return (
    path === "/health" ||
    path === "/api/setup/status" ||
    path === "/api/setup/admin" ||
    path.startsWith("/api/auth/")
  )
}

/**
 * Optional deployment-wide emergency Basic Auth for bootstrap-only protection.
 * Normal application access uses Playblast sessions instead.
 */
export function createAuthMiddleware() {
  const credentials = readEmergencyCredentials()

  return (request: Request, response: Response, next: NextFunction): void => {
    if (!credentials) {
      next()
      return
    }

    const setup = getSetupStatusResponse()
    if (setup.setupComplete || isEmergencyBootstrapPath(request)) {
      next()
      return
    }

    if (hasValidCredentials(request, credentials)) {
      next()
      return
    }

    response.setHeader("WWW-Authenticate", 'Basic realm="Playblast emergency bootstrap"')
    response.status(401).json({ error: "Authentication required" })
  }
}
