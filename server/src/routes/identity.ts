import { Router } from "express"
import fs from "node:fs"
import path from "node:path"
import {
  getCapabilitiesForRole,
  type ChangePasswordRequest,
  type CreateBootstrapAdminRequest,
  type LoginRequest,
  type RecoverAdminRequest,
  type RoleCapabilitiesResponse,
  type UpdateStudioRequest,
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
import {
  StudioServiceError,
  completeStudioSetup,
  deleteStudioAvatar,
  getStudioAvatarAbsolutePath,
  updateStudioProfile,
  uploadStudioAvatar,
} from "../identity/studio-service.js"
import { getAvatarContentType } from "../identity/studio-validation.js"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "../auth/audit.js"
import { getSessionTokenFromRequest } from "../auth/cookies.js"
import { AUTH_RATE_LIMITS, checkRateLimit } from "../auth/rate-limit.js"
import { createAvatarUploadMiddleware } from "../middleware/avatar-upload.js"
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

function handleStudioServiceError(
  error: unknown,
  response: Parameters<typeof sendApiError>[0],
): boolean {
  if (!(error instanceof StudioServiceError)) {
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
  const studio = getStudioProfile()
  if (!studio) {
    sendApiError(res, "NOT_FOUND")
    return
  }

  res.json(studio)
})

identityRouter.patch(
  "/studio",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    try {
      const studio = updateStudioProfile(
        req.currentSession!.studio.id,
        req.currentSession!.user.role,
        req.body as UpdateStudioRequest,
      )
      res.json(studio)
    } catch (error) {
      if (!handleStudioServiceError(error, res)) {
        throw error
      }
    }
  },
)

identityRouter.post(
  "/studio/avatar",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  createAvatarUploadMiddleware(),
  (req, res) => {
    if (!req.file) {
      sendApiError(res, "VALIDATION_FAILED", "Validation failed.", {
        avatar: ["Avatar file is required."],
      })
      return
    }

    try {
      const studio = uploadStudioAvatar(
        req.currentSession!.studio.id,
        req.currentSession!.user.role,
        {
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      )
      res.json(studio)
    } catch (error) {
      if (!handleStudioServiceError(error, res)) {
        throw error
      }
    }
  },
)

identityRouter.delete(
  "/studio/avatar",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    try {
      const studio = deleteStudioAvatar(
        req.currentSession!.studio.id,
        req.currentSession!.user.role,
      )
      res.json(studio)
    } catch (error) {
      if (!handleStudioServiceError(error, res)) {
        throw error
      }
    }
  },
)

identityRouter.get(
  "/studio/avatar",
  requireAuthenticatedSession(),
  (req, res) => {
    const absolutePath = getStudioAvatarAbsolutePath(req.currentSession!.studio.id)
    if (!absolutePath) {
      sendApiError(res, "NOT_FOUND")
      return
    }

    const extension = path.extname(absolutePath).slice(1)
    res.setHeader("Content-Type", getAvatarContentType(extension))
    res.setHeader("Cache-Control", "private, no-cache")
    fs.createReadStream(absolutePath).pipe(res)
  },
)

identityRouter.post(
  "/setup/complete",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    try {
      const studio = completeStudioSetup(
        req.currentSession!.studio.id,
        req.currentSession!.user.role,
      )
      res.json(studio)
    } catch (error) {
      if (!handleStudioServiceError(error, res)) {
        throw error
      }
    }
  },
)

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
