import { Router } from "express"
import type {
  AcceptInvitationRequest,
  CreateInvitationRequest,
  TestSmtpRequest,
  UpdateSmtpSettingsRequest,
  UpdateUserRequest,
} from "@playblast/shared"
import { sendApiError } from "../lib/api-response.js"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "../auth/audit.js"
import { AUTH_RATE_LIMITS, checkRateLimit } from "../auth/rate-limit.js"
import { decryptSecret } from "../identity/secret-crypto.js"
import {
  getSmtpSettings,
  SmtpServiceError,
  testSmtpDelivery,
  upsertSmtpSettings,
} from "../identity/smtp-service.js"
import { studioSmtpSettings } from "../db/schema/identity.js"
import { getDrizzle } from "../db/drizzle.js"
import { eq } from "drizzle-orm"
import {
  acceptInvitation,
  createInvitation,
  getInvitePreview,
  resendInvitation,
  revokeInvitation,
  TeamServiceError,
  updateStudioUser,
} from "../identity/team-service.js"
import { getSetupStatusResponse, listInvitations, listUsers } from "../identity/repository.js"
import { getParam } from "../utils/params.js"
import {
  requireAdminRole,
  requireAuthenticatedSession,
  requireCsrfProtection,
} from "../middleware/session.js"

const teamRouter = Router()

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

function handleTeamServiceError(
  error: unknown,
  response: Parameters<typeof sendApiError>[0],
): boolean {
  if (!(error instanceof TeamServiceError)) {
    return false
  }

  sendApiError(response, error.code, error.message, error.details)
  return true
}

function handleSmtpServiceError(
  error: unknown,
  response: Parameters<typeof sendApiError>[0],
): boolean {
  if (!(error instanceof SmtpServiceError)) {
    return false
  }

  sendApiError(response, error.code, error.message, error.details)
  return true
}

function requireSetupComplete(
  response: Parameters<typeof sendApiError>[0],
): boolean {
  const setup = getSetupStatusResponse()
  if (!setup.setupComplete) {
    sendApiError(response, "SETUP_NOT_COMPLETE")
    return false
  }
  return true
}

teamRouter.get(
  "/smtp",
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    if (!requireSetupComplete(res)) {
      return
    }

    res.json(getSmtpSettings(req.currentSession!.studio.id))
  },
)

teamRouter.put(
  "/smtp",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    if (!requireSetupComplete(res)) {
      return
    }

    const studioId = req.currentSession!.studio.id
    const db = getDrizzle()
    const existing = db
      .select()
      .from(studioSmtpSettings)
      .where(eq(studioSmtpSettings.studioId, studioId))
      .get()

    let existingPassword: string | undefined
    if (existing && !req.body?.password) {
      existingPassword = decryptSecret(existing.passwordEncrypted)
    }

    try {
      const settings = upsertSmtpSettings(
        studioId,
        req.body as UpdateSmtpSettingsRequest,
        existingPassword,
      )

      recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.smtpConfigured,
        studioId,
        userId: req.currentSession!.user.id,
      })

      res.json(settings)
    } catch (error) {
      if (!handleSmtpServiceError(error, res)) {
        throw error
      }
    }
  },
)

teamRouter.post(
  "/smtp/test",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  async (req, res) => {
    if (!requireSetupComplete(res)) {
      return
    }

    if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.smtpTest)) {
      return
    }

    const studioId = req.currentSession!.studio.id

    try {
      const result = await testSmtpDelivery(
        studioId,
        req.currentSession!.user.email,
        req.body as TestSmtpRequest,
      )

      recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.smtpTestSucceeded,
        studioId,
        userId: req.currentSession!.user.id,
      })

      res.json(result)
    } catch (error) {
      if (error instanceof SmtpServiceError && error.code === "DELIVERY_FAILED") {
        recordAuditEvent({
          eventType: AUDIT_EVENT_TYPES.smtpTestFailed,
          studioId,
          userId: req.currentSession!.user.id,
        })
      }

      if (!handleSmtpServiceError(error, res)) {
        throw error
      }
    }
  },
)

teamRouter.post(
  "/invitations",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  async (req, res) => {
    if (!requireSetupComplete(res)) {
      return
    }

    if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.invite)) {
      return
    }

    try {
      const invitation = await createInvitation(
        req.currentSession!.studio.id,
        req.currentSession!.user.id,
        req.body as CreateInvitationRequest,
      )
      res.status(201).json(invitation)
    } catch (error) {
      if (!handleTeamServiceError(error, res)) {
        if (!handleSmtpServiceError(error, res)) {
          throw error
        }
      }
    }
  },
)

teamRouter.post(
  "/invitations/:invitationId/resend",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  async (req, res) => {
    if (!requireSetupComplete(res)) {
      return
    }

    if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.invite)) {
      return
    }

    try {
      const invitation = await resendInvitation(
        req.currentSession!.studio.id,
        getParam(req.params.invitationId),
        req.currentSession!.user.id,
      )
      res.json(invitation)
    } catch (error) {
      if (!handleTeamServiceError(error, res)) {
        if (!handleSmtpServiceError(error, res)) {
          throw error
        }
      }
    }
  },
)

teamRouter.post(
  "/invitations/:invitationId/revoke",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    if (!requireSetupComplete(res)) {
      return
    }

    try {
      const invitation = revokeInvitation(
        req.currentSession!.studio.id,
        getParam(req.params.invitationId),
        req.currentSession!.user.id,
      )
      res.json(invitation)
    } catch (error) {
      if (!handleTeamServiceError(error, res)) {
        throw error
      }
    }
  },
)

teamRouter.patch(
  "/users/:userId",
  requireCsrfProtection(),
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    if (!requireSetupComplete(res)) {
      return
    }

    try {
      const user = updateStudioUser(
        req.currentSession!.studio.id,
        getParam(req.params.userId),
        req.currentSession!.user.id,
        req.body as UpdateUserRequest,
      )
      res.json(user)
    } catch (error) {
      if (!handleTeamServiceError(error, res)) {
        throw error
      }
    }
  },
)

teamRouter.get("/invites/:token", (req, res) => {
  try {
    res.json(getInvitePreview(getParam(req.params.token)))
  } catch (error) {
    if (!handleTeamServiceError(error, res)) {
      throw error
    }
  }
})

teamRouter.post("/invites/:token/accept", requireCsrfProtection(), async (req, res) => {
  if (!enforceRateLimit(req, res, AUTH_RATE_LIMITS.inviteAccept)) {
    return
  }

  try {
    const body = await acceptInvitation(
      getParam(req.params.token),
      req.body as AcceptInvitationRequest,
      res,
    )
    res.json(body)
  } catch (error) {
    if (!handleTeamServiceError(error, res)) {
      throw error
    }
  }
})

export { listUsers, listInvitations }
export default teamRouter
