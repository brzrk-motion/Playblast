import type { NextFunction, Request, Response } from "express"
import { hasCapability, type Capability } from "@playblast/shared"
import { sendApiError } from "../lib/api-response.js"
import { getSetupStatusResponse } from "../identity/repository.js"
import {
  requireAuthenticatedSession,
  requireAdminRole,
} from "./session.js"

export { requireAuthenticatedSession, requireAdminRole }

export function requireSetupComplete() {
  return (request: Request, response: Response, next: NextFunction): void => {
    const setup = getSetupStatusResponse()
    if (!setup.setupComplete) {
      sendApiError(response, "SETUP_NOT_COMPLETE")
      return
    }

    next()
  }
}

export function requireCapability(capability: Capability) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.currentSession) {
      sendApiError(response, "UNAUTHENTICATED")
      return
    }

    if (!hasCapability(request.currentSession.user.role, capability)) {
      sendApiError(response, "FORBIDDEN")
      return
    }

    next()
  }
}

export function requireAdminOnly() {
  return requireAdminRole()
}

export const protectedApiMiddleware = [
  requireAuthenticatedSession(),
  requireSetupComplete(),
]
