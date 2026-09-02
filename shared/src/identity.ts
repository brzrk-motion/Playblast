import type { Capability } from "./capabilities.js"
import type { SetupStatus } from "./bootstrap.js"
import type { UserRole } from "./roles.js"

/** Public setup status contract (GET /api/setup/status). */
export interface SetupStatusResponse {
  status: SetupStatus
  nextRoute: string
  setupComplete: boolean
}

/** Authenticated user summary embedded in session responses. */
export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  disabled: boolean
}

/** Studio summary embedded in session responses. */
export interface SessionStudio {
  id: string
  name: string
  setupStatus: SetupStatus
  /** Authorized avatar URL when a studio image exists; null otherwise. */
  avatarUrl: string | null
}

/** Current session contract (GET /api/session). */
export interface CurrentSessionResponse {
  user: SessionUser
  studio: SessionStudio
  expiresAt: string
}

/** Studio profile contract (GET /api/studio). */
export interface StudioProfileResponse {
  id: string
  name: string
  avatarUrl: string | null
  setupStatus: SetupStatus
  createdAt: string
  updatedAt: string
}

/** Team user listing contract (GET /api/users). */
export interface UserSummary {
  id: string
  name: string
  email: string
  role: UserRole
  disabled: boolean
  createdAt: string
  updatedAt: string
}

export const INVITATION_STATUSES = [
  "pending",
  "accepted",
  "expired",
  "revoked",
  "delivery_failed",
] as const

export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

/** Invitation listing contract (GET /api/invitations). */
export interface InvitationSummary {
  id: string
  email: string
  name: string
  role: Exclude<UserRole, "admin">
  status: InvitationStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}

/** Role capability contract (GET /api/capabilities). */
export interface RoleCapabilitiesResponse {
  role: UserRole
  capabilities: Capability[]
}
