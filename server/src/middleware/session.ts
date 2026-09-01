import type { NextFunction, Request, Response } from "express"
import { sendApiError } from "../lib/api-response.js"
import { getCsrfTokenFromRequest, getSessionTokenFromRequest } from "../auth/cookies.js"
import {
  getCurrentSessionResponse,
  resolveSession,
  type SessionContext,
} from "../auth/session.js"

declare module "express-serve-static-core" {
  interface Request {
    sessionContext?: SessionContext | null
    currentSession?: ReturnType<typeof getCurrentSessionResponse>
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export function attachSessionContext() {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const token = getSessionTokenFromRequest(request)
    const context = resolveSession(token)
    request.sessionContext = context
    request.currentSession = context ? getCurrentSessionResponse(context) : null
    next()
  }
}

export function requireAuthenticatedSession() {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.currentSession) {
      const token = getSessionTokenFromRequest(request)
      if (token) {
        sendApiError(response, "SESSION_EXPIRED")
        return
      }

      sendApiError(response, "UNAUTHENTICATED")
      return
    }

    next()
  }
}

export function requireCsrfProtection() {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      next()
      return
    }

    const sessionToken = getSessionTokenFromRequest(request)
    if (!sessionToken) {
      next()
      return
    }

    const cookieToken = getCsrfTokenFromRequest(request)
    const headerToken = request.header("x-csrf-token")

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      sendApiError(response, "FORBIDDEN", "Invalid CSRF token.")
      return
    }

    next()
  }
}

export function requireAdminRole() {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.currentSession) {
      sendApiError(response, "UNAUTHENTICATED")
      return
    }

    if (request.currentSession.user.role !== "admin") {
      sendApiError(response, "FORBIDDEN")
      return
    }

    next()
  }
}
