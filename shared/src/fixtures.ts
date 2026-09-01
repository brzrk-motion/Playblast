import type { UserRole } from "./roles.js"
import type { SetupStatus } from "./bootstrap.js"

export interface FixtureStudio {
  id: string
  name: string
  setupStatus: SetupStatus
}

export interface FixtureUser {
  id: string
  studioId: string
  name: string
  email: string
  role: UserRole
  disabled: boolean
}

export interface FixtureSession {
  id: string
  userId: string
  studioId: string
  expiresAt: string
}

export interface FixtureInvitation {
  id: string
  studioId: string
  email: string
  role: Exclude<UserRole, "admin">
  status: "pending" | "accepted" | "expired" | "revoked"
}

export const FIXTURE_STUDIO: FixtureStudio = {
  id: "studio-fixture-1",
  name: "Fixture Studio",
  setupStatus: "complete",
}

export const FIXTURE_USERS: Record<UserRole, FixtureUser> = {
  admin: {
    id: "user-fixture-admin",
    studioId: FIXTURE_STUDIO.id,
    name: "Fixture Admin",
    email: "admin@fixture.studio",
    role: "admin",
    disabled: false,
  },
  creative: {
    id: "user-fixture-creative",
    studioId: FIXTURE_STUDIO.id,
    name: "Fixture Creative",
    email: "creative@fixture.studio",
    role: "creative",
    disabled: false,
  },
  proofing: {
    id: "user-fixture-proofing",
    studioId: FIXTURE_STUDIO.id,
    name: "Fixture Proofing",
    email: "proofing@fixture.studio",
    role: "proofing",
    disabled: false,
  },
}

export const FIXTURE_SESSIONS: Record<UserRole, FixtureSession> = {
  admin: {
    id: "session-fixture-admin",
    userId: FIXTURE_USERS.admin.id,
    studioId: FIXTURE_STUDIO.id,
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  creative: {
    id: "session-fixture-creative",
    userId: FIXTURE_USERS.creative.id,
    studioId: FIXTURE_STUDIO.id,
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  proofing: {
    id: "session-fixture-proofing",
    userId: FIXTURE_USERS.proofing.id,
    studioId: FIXTURE_STUDIO.id,
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
}

export const FIXTURE_INVITATIONS: FixtureInvitation[] = [
  {
    id: "invite-fixture-creative",
    studioId: FIXTURE_STUDIO.id,
    email: "new-creative@fixture.studio",
    role: "creative",
    status: "pending",
  },
  {
    id: "invite-fixture-proofing",
    studioId: FIXTURE_STUDIO.id,
    email: "new-proofing@fixture.studio",
    role: "proofing",
    status: "pending",
  },
]

export function getFixtureUser(role: UserRole): FixtureUser {
  return FIXTURE_USERS[role]
}

export function getFixtureSession(role: UserRole): FixtureSession {
  return FIXTURE_SESSIONS[role]
}
