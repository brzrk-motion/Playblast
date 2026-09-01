import { Router } from "express"
import {
  getCapabilitiesForRole,
  type RoleCapabilitiesResponse,
} from "@playblast/shared"
import { sendApiError } from "../lib/api-response.js"
import {
  getSetupStatusResponse,
  getStudioProfile,
  listInvitations,
  listUsers,
} from "../identity/repository.js"

const identityRouter = Router()

identityRouter.get("/setup/status", (_req, res) => {
  res.json(getSetupStatusResponse())
})

identityRouter.get("/session", (_req, res) => {
  sendApiError(res, "UNAUTHENTICATED")
})

identityRouter.get("/studio", (_req, res) => {
  const setup = getSetupStatusResponse()
  if (!setup.setupComplete) {
    sendApiError(res, "SETUP_NOT_COMPLETE")
    return
  }

  sendApiError(res, "UNAUTHENTICATED")
})

identityRouter.get("/users", (_req, res) => {
  const setup = getSetupStatusResponse()
  if (!setup.setupComplete) {
    sendApiError(res, "SETUP_NOT_COMPLETE")
    return
  }

  sendApiError(res, "UNAUTHENTICATED")
})

identityRouter.get("/invitations", (_req, res) => {
  const setup = getSetupStatusResponse()
  if (!setup.setupComplete) {
    sendApiError(res, "SETUP_NOT_COMPLETE")
    return
  }

  sendApiError(res, "UNAUTHENTICATED")
})

identityRouter.get("/capabilities", (_req, res) => {
  sendApiError(res, "UNAUTHENTICATED")
})

export default identityRouter

/**
 * Authenticated identity handlers used by Phase 2+ routes and contract tests.
 * Phase 1 exposes the response shapes without live session authentication.
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
