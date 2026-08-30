import { timingSafeEqual } from "node:crypto"
import type { NextFunction, Request, Response } from "express"
import { isProduction } from "../config/env.js"

type Credentials = {
  username: string
  password: string
}

function readCredentials(): Credentials | null {
  const username = process.env.PLAYBLAST_AUTH_USER
  const password = process.env.PLAYBLAST_AUTH_PASSWORD

  if (!isProduction() && !username && !password) {
    return null
  }

  if (!username || !password) {
    throw new Error(
      "PLAYBLAST_AUTH_USER and PLAYBLAST_AUTH_PASSWORD are required in production",
    )
  }

  return { username, password }
}

function safelyEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function hasValidCredentials(request: Request, expected: Credentials): boolean {
  const header = request.header("authorization")
  if (!header?.startsWith("Basic ")) {
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

  return (
    safelyEqual(decoded.slice(0, separator), expected.username) &&
    safelyEqual(decoded.slice(separator + 1), expected.password)
  )
}

export function createAuthMiddleware() {
  const credentials = readCredentials()

  return (request: Request, response: Response, next: NextFunction): void => {
    if (!credentials || hasValidCredentials(request, credentials)) {
      next()
      return
    }

    response.setHeader("WWW-Authenticate", 'Basic realm="Playblast pilot"')
    response.status(401).json({ error: "Authentication required" })
  }
}
