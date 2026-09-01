import { eq } from "drizzle-orm"
import {
  getBootstrapStep,
  isApplicationRouteAvailable,
  type SetupStatus,
  type SetupStatusResponse,
  type StudioProfileResponse,
  type UserSummary,
  type InvitationSummary,
} from "@playblast/shared"
import { getDrizzle } from "../db/drizzle.js"
import {
  auditEvents,
  invitations,
  studios,
  users,
} from "../db/schema/identity.js"

export function getSetupStatusResponse(): SetupStatusResponse {
  const studio = getStudioRow()
  const status: SetupStatus = studio?.setupStatus ?? "pending"
  const step = getBootstrapStep(status)

  return {
    status,
    nextRoute: step.nextRoute,
    setupComplete: isApplicationRouteAvailable(status),
  }
}

export function getStudioProfile(): StudioProfileResponse | null {
  const studio = getStudioRow()
  if (!studio) {
    return null
  }

  return {
    id: studio.id,
    name: studio.name,
    avatarUrl: studio.avatarPath ? `/api/studio/avatar` : null,
    setupStatus: studio.setupStatus,
    createdAt: studio.createdAt,
    updatedAt: studio.updatedAt,
  }
}

export function listUsers(): UserSummary[] {
  const db = getDrizzle()
  const rows = db.select().from(users).all()

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    disabled: row.disabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

export function listInvitations(): InvitationSummary[] {
  const db = getDrizzle()
  const rows = db.select().from(invitations).all()

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

export function getStudioCount(): number {
  const db = getDrizzle()
  return db.select().from(studios).all().length
}

export function getUserCount(): number {
  const db = getDrizzle()
  return db.select().from(users).all().length
}

export function getAuditEventCount(): number {
  const db = getDrizzle()
  return db.select().from(auditEvents).all().length
}

function getStudioRow() {
  const db = getDrizzle()
  return db.select().from(studios).limit(1).get()
}

export function getStudioRowById(id: string) {
  const db = getDrizzle()
  return db.select().from(studios).where(eq(studios.id, id)).get()
}

export function updateStudioById(
  id: string,
  patch: {
    name?: string
    avatarPath?: string | null
    setupStatus?: SetupStatus
  },
) {
  const db = getDrizzle()
  const now = new Date().toISOString()
  const values: Partial<typeof studios.$inferInsert> = {
    updatedAt: now,
  }

  if (patch.name !== undefined) {
    values.name = patch.name
  }

  if (patch.avatarPath !== undefined) {
    values.avatarPath = patch.avatarPath
  }

  if (patch.setupStatus !== undefined) {
    values.setupStatus = patch.setupStatus
  }

  db.update(studios).set(values).where(eq(studios.id, id)).run()
  return getStudioRowById(id)
}

/** @internal Test helper to read setup status from a specific studio row. */
export function __testOnly_getStudioById(id: string) {
  const db = getDrizzle()
  return db.select().from(studios).where(eq(studios.id, id)).get()
}
