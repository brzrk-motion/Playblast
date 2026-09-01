import { Router } from "express"
import {
  getCapabilitiesForRole,
  type ChangePasswordRequest,
  type CreateBootstrapAdminRequest,
  type LoginRequest,
  type RecoverAdminRequest,
  type RoleCapabilitiesResponse,
} from "@playblast/shared"
import { sendApiError } from "../lib/api-response.js"
import {
  AuthServiceError,
  changePassword,
  createBootstrapAdmin,
  loginUser,
  logoutUser,
  recoverAdminPassword,
} from "../identity/auth-service.js"
import {
  getSetupStatusResponse,
  getStudioProfile,
  listInvitations,
  listUsers,
} from "../identity/repository.js"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "../auth/audit.js"
import { getSessionTokenFromRequest } from "../auth/cookies.js"
import { AUTH_RATE_LIMITS, checkRateLimit } from "../auth/rate-limit.js"
import {
  requireAdminRole,
  requireAuthenticatedSession,
  requireCsrfProtection,
} from "../middleware/session.js"

const identityRouter = Router()

function handleAuthServiceError(
  error: unknown,
  response: Parameters<typeof sendApiError>[0],
): boolean {
  if (!(error instanceof AuthServiceError)) {
    return false
  }

  sendApiError(response, error.code, error.message, error.details)
  return true
}

function enforceRateLimit(
  request: Parameters<typeof checkRateLimit>[0],
  response: Parameters<typeof sendApiError>[0],
  rule: (typeof AUTH_RATE_LIMITS)[keyof typeof AUTH_RATE_LIMITS],
): boolean {
  const result = checkRateLimit(request, rule)
  if (result.allowed) {
    return true
  }

  response.setHeader("Retry-After", String(result.retryAfterSeconds))
  recordAuditEvent({ eventType: AUDIT_EVENT_TYPES.rateLimited })
  sendApiError(response, "RATE_LIMITED")
  return false
}

identityRouter.get("/setup/status", (_req, res) => {
  res.json(getSetupStatusResponse())
})

identityRouter.post("/setup/admin", requireCsrfProtection(), async (req, res) => {
  if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.setup)) {
    return
  }

  const setup = getSetupStatusResponse()
  if (setup.status !== "pending") {
    sendApiError(res, "SETUP_ALREADY_COMPLETE")
    return
  }

  try {
    const body = await createBootstrapAdmin(
      req.body as CreateBootstrapAdminRequest,
      res,
    )
    res.status(201).json(body)
  } catch (error) {
    if (!handleAuthServiceError(error, res)) {
      throw error
    }
  }
})

identityRouter.post("/auth/login", requireCsrfProtection(), async (req, res) => {
  if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.login)) {
    return
  }

  try {
    const body = await loginUser(req.body as LoginRequest, res)
    res.json(body)
  } catch (error) {
    if (!handleAuthServiceError(error, res)) {
      throw error
    }
  }
})

identityRouter.post("/auth/logout", requireCsrfProtection(), (req, res) => {
  logoutUser(getSessionTokenFromRequest(req), res)
  res.status(204).send()
})

identityRouter.post("/auth/recover-admin", requireCsrfProtection(), async (req, res) => {
  if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.recovery)) {
    return
  }

  try {
    await recoverAdminPassword(req.body as RecoverAdminRequest)
    res.status(204).send()
  } catch (error) {
    if (!handleAuthServiceError(error, res)) {
      throw error
    }
  }
})

identityRouter.patch(
  "/auth/password",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  async (req, res) => {
    if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.passwordChange)) {
      return
    }

    try {
      await changePassword(
        req.currentSession!.user.id,
        req.body as ChangePasswordRequest,
      )
      logoutUser(getSessionTokenFromRequest(req), res)
      res.status(204).send()
    } catch (error) {
      if (!handleAuthServiceError(error, res)) {
        throw error
      }
    }
  },
)

identityRouter.get("/session", (req, res) => {
  if (!req.currentSession) {
    const token = getSessionTokenFromRequest(req)
    if (token) {
      sendApiError(res, "SESSION_EXPIRED")
      return
    }

    sendApiError(res, "UNAUTHENTICATED")
    return
  }

  res.json(req.currentSession)
})

identityRouter.get("/studio", requireAuthenticatedSession(), (_req, res) => {
  const setup = getSetupStatusResponse()
  if (!setup.setupComplete) {
    sendApiError(res, "SETUP_NOT_COMPLETE")
    return
  }

  const studio = getStudioProfile()
  if (!studio) {
    sendApiError(res, "NOT_FOUND")
    return
  }

  res.json(studio)
})

identityRouter.get("/users", requireAuthenticatedSession(), requireAdminRole(), (_req, res) => {
  const setup = getSetupStatusResponse()
  if (!setup.setupComplete) {
    sendApiError(res, "SETUP_NOT_COMPLETE")
    return
  }

  res.json(listUsers())
})

identityRouter.get(
  "/invitations",
  requireAuthenticatedSession(),
  requireAdminRole(),
  (_req, res) => {
    const setup = getSetupStatusResponse()
    if (!setup.setupComplete) {
      sendApiError(res, "SETUP_NOT_COMPLETE")
      return
    }

    res.json(listInvitations())
  },
)

identityRouter.get("/capabilities", requireAuthenticatedSession(), (req, res) => {
  res.json(buildCapabilitiesResponse(req.currentSession!.user.role))
})

export default identityRouter

/**
 * Authenticated identity handlers used by Phase 2+ routes and contract tests.
 */
export function buildStudioProfileResponse() {
  return getStudioProfile()
}

export function buildUsersResponse() {
  return listUsers()
}

export function buildInvitationsResponse() {
  return listInvitations()
}

export function buildCapabilitiesResponse(role: RoleCapabilitiesResponse["role"]): RoleCapabilitiesResponse {
  return {
    role,
    capabilities: getCapabilitiesForRole(role),
  }
}
