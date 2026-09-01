import type { Request, Response } from "express"
import { isProduction } from "../config/env.js"
import { authConfig } from "./config.js"

interface CookieSerializeOptions {
  maxAgeMs?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: "strict" | "lax" | "none"
  path?: string
}

function serializeCookie(
  name: string,
  value: string,
  options: CookieSerializeOptions,
): string {
  const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]

  if (options.maxAgeMs !== undefined) {
    segments.push(`Max-Age=${Math.floor(options.maxAgeMs / 1000)}`)
  }

  if (options.httpOnly) {
    segments.push("HttpOnly")
  }

  if (options.secure) {
    segments.push("Secure")
  }

  if (options.sameSite) {
    const label =
      options.sameSite === "strict"
        ? "Strict"
        : options.sameSite === "lax"
          ? "Lax"
          : "None"
    segments.push(`SameSite=${label}`)
  }

  segments.push(`Path=${options.path ?? "/"}`)
  return segments.join("; ")
}

function getBaseCookieOptions(maxAgeMs?: number): CookieSerializeOptions {
  return {
    maxAgeMs,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
  }
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) {
    return {}
  }

  const cookies: Record<string, string> = {}
  for (const part of header.split(";")) {
    const trimmed = part.trim()
    if (!trimmed) {
      continue
    }

    const separator = trimmed.indexOf("=")
    if (separator < 0) {
      continue
    }

    const name = decodeURIComponent(trimmed.slice(0, separator))
    const value = decodeURIComponent(trimmed.slice(separator + 1))
    cookies[name] = value
  }

  return cookies
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.cookie)
  return cookies[authConfig.cookieNames.session] ?? null
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.cookie)
  return cookies[authConfig.cookieNames.csrf] ?? null
}

export function setSessionCookies(
  response: Response,
  sessionToken: string,
  csrfToken: string,
  maxAgeMs: number,
): void {
  response.append(
    "Set-Cookie",
    serializeCookie(
      authConfig.cookieNames.session,
      sessionToken,
      getBaseCookieOptions(maxAgeMs),
    ),
  )
  response.append(
    "Set-Cookie",
    serializeCookie(authConfig.cookieNames.csrf, csrfToken, {
      ...getBaseCookieOptions(maxAgeMs),
      httpOnly: false,
    }),
  )
}

export function clearSessionCookies(response: Response): void {
  const base = {
    maxAgeMs: 0,
    secure: isProduction(),
    sameSite: "strict" as const,
    path: "/",
  }

  response.append(
    "Set-Cookie",
    serializeCookie(authConfig.cookieNames.session, "", {
      ...base,
      httpOnly: true,
    }),
  )
  response.append(
    "Set-Cookie",
    serializeCookie(authConfig.cookieNames.csrf, "", {
      ...base,
      httpOnly: false,
    }),
  )
}

/** @internal Test helper for cookie flag assertions. */
export function __testOnly_serializeCookie(
  name: string,
  value: string,
  options: CookieSerializeOptions,
): string {
  return serializeCookie(name, value, options)
}
