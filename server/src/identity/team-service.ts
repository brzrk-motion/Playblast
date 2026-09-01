import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import type {
  AcceptInvitationRequest,
  AuthSuccessResponse,
  CreateInvitationRequest,
  InvitationCreatedResponse,
  InvitationSummary,
  InvitePreviewResponse,
  UpdateUserRequest,
  UserRole,
  UserSummary,
} from "@playblast/shared"
import { INVITE_EXPIRY_HOURS, INVITABLE_ROLES } from "@playblast/shared"
import type { Response } from "express"
import { getDrizzle } from "../db/drizzle.js"
import { invitations, studios, users } from "../db/schema/identity.js"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "../auth/audit.js"
import { authConfig } from "../auth/config.js"
import { setSessionCookies } from "../auth/cookies.js"
import {
  hashPassword,
  normalizeEmail,
  validatePasswordConfirmation,
  validatePasswordPolicy,
} from "../auth/password.js"
import { createSession, destroyAllSessionsForUser } from "../auth/session.js"
import { generateOpaqueToken, hashToken, verifyTokenHash } from "../auth/tokens.js"
import {
  buildInviteEmailContent,
  getSmtpSettings,
  requireVerifiedSmtp,
  sendSmtpMessage,
} from "./smtp-service.js"

export class TeamServiceError extends Error {
  constructor(
    readonly code:
      | "VALIDATION_FAILED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVITE_EXPIRED"
      | "INVITE_REVOKED"
      | "INVITE_ALREADY_USED"
      | "INVITE_MALFORMED"
      | "DELIVERY_FAILED",
    readonly message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "TeamServiceError"
  }
}

function mapInvitation(row: typeof invitations.$inferSelect): InvitationSummary {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapUser(row: typeof users.$inferSelect): UserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    disabled: row.disabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function validateName(name: string): string[] {
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return ["Name must be at least 2 characters."]
  }
  if (trimmed.length > 120) {
    return ["Name must be 120 characters or fewer."]
  }
  return []
}

function validateEmail(email: string): string[] {
  const trimmed = email.trim()
  if (!trimmed) {
    return ["Email is required."]
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return ["Enter a valid email address."]
  }
  return []
}

function countActiveAdmins(studioId: string, excludeUserId?: string): number {
  const db = getDrizzle()
  const rows = db
    .select()
    .from(users)
    .where(
      and(
        eq(users.studioId, studioId),
        eq(users.role, "admin"),
        eq(users.disabled, false),
      ),
    )
    .all()

  return rows.filter((row) => row.id !== excludeUserId).length
}

function assertNotLastAdmin(
  studioId: string,
  userId: string,
  userRole: UserRole,
  nextRole?: UserRole,
  disabling?: boolean,
): void {
  if (userRole !== "admin") {
    return
  }

  const remainingAdmins = countActiveAdmins(studioId, userId)
  const willRemainAdmin =
    !disabling && (nextRole === undefined || nextRole === "admin")

  if (remainingAdmins === 0 && !willRemainAdmin) {
    throw new TeamServiceError(
      "CONFLICT",
      "Cannot remove or disable the last active Admin for this studio.",
      { user: ["At least one active Admin is required."] },
    )
  }
}

function isPrivilegeReduction(currentRole: UserRole, nextRole: UserRole): boolean {
  const rank: Record<UserRole, number> = {
    admin: 3,
    creative: 2,
    proofing: 1,
  }
  return rank[nextRole] < rank[currentRole]
}

function expireStaleInvitations(studioId: string): void {
  const db = getDrizzle()
  const now = new Date().toISOString()
  const pending = db
    .select()
    .from(invitations)
    .where(
      and(eq(invitations.studioId, studioId), eq(invitations.status, "pending")),
    )
    .all()

  for (const invite of pending) {
    if (invite.expiresAt <= now) {
      db.update(invitations)
        .set({ status: "expired", updatedAt: now })
        .where(eq(invitations.id, invite.id))
        .run()
    }
  }
}

function getInviteExpiryIso(): string {
  return new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
}

function buildInviteUrl(instanceUrl: string, token: string): string {
  return `${instanceUrl.replace(/\/$/, "")}/invite/${token}`
}

async function deliverInvitationEmail(input: {
  studioId: string
  studioName: string
  invitation: typeof invitations.$inferSelect
  token: string
}): Promise<"sent" | "failed"> {
  const settings = getSmtpSettings(input.studioId)
  const message = buildInviteEmailContent({
    studioName: input.studioName,
    recipientName: input.invitation.name,
    recipientEmail: input.invitation.email,
    role: input.invitation.role,
    instanceUrl: settings.instanceUrl ?? "",
    inviteUrl: buildInviteUrl(settings.instanceUrl ?? "", input.token),
    expiresAt: input.invitation.expiresAt,
  })

  const result = await sendSmtpMessage(input.studioId, message)
  return result.success ? "sent" : "failed"
}

export async function createInvitation(
  studioId: string,
  invitedByUserId: string,
  input: CreateInvitationRequest,
): Promise<InvitationCreatedResponse> {
  requireVerifiedSmtp(studioId)

  const details: Record<string, string[]> = {}
  const nameErrors = validateName(input.name)
  const emailErrors = validateEmail(input.email)

  if (nameErrors.length) details.name = nameErrors
  if (emailErrors.length) details.email = emailErrors

  if (!INVITABLE_ROLES.includes(input.role)) {
    details.role = ["Role must be creative or proofing."]
  }

  if (Object.keys(details).length > 0) {
    throw new TeamServiceError("VALIDATION_FAILED", "Validation failed.", details)
  }

  const emailNormalized = normalizeEmail(input.email)
  const db = getDrizzle()
  expireStaleInvitations(studioId)

  const existingUser = db
    .select()
    .from(users)
    .where(
      and(eq(users.studioId, studioId), eq(users.emailNormalized, emailNormalized)),
    )
    .get()

  if (existingUser && !existingUser.disabled) {
    throw new TeamServiceError(
      "CONFLICT",
      "A user with this email already belongs to the studio.",
    )
  }

  const pendingInvite = db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.studioId, studioId),
        eq(invitations.emailNormalized, emailNormalized),
        eq(invitations.status, "pending"),
      ),
    )
    .get()

  if (pendingInvite) {
    throw new TeamServiceError(
      "CONFLICT",
      "A pending invitation already exists for this email. Resend or revoke it first.",
    )
  }

  const studio = db.select().from(studios).where(eq(studios.id, studioId)).get()
  if (!studio) {
    throw new TeamServiceError("NOT_FOUND", "Studio not found.")
  }

  const token = generateOpaqueToken()
  const now = new Date().toISOString()
  const invitationId = randomUUID()

  db.insert(invitations)
    .values({
      id: invitationId,
      studioId,
      email: input.email.trim(),
      emailNormalized,
      name: input.name.trim(),
      role: input.role,
      tokenHash: hashToken(token),
      status: "pending",
      expiresAt: getInviteExpiryIso(),
      invitedByUserId,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  const invitation = db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .get()!

  const deliveryStatus = await deliverInvitationEmail({
    studioId,
    studioName: studio.name || "Playblast Studio",
    invitation,
    token,
  })

  if (deliveryStatus === "failed") {
    db.update(invitations)
      .set({ status: "delivery_failed", updatedAt: new Date().toISOString() })
      .where(eq(invitations.id, invitationId))
      .run()

    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.inviteDeliveryFailed,
      studioId,
      userId: invitedByUserId,
      metadata: { invitationId, email: invitation.email },
    })

    throw new TeamServiceError(
      "DELIVERY_FAILED",
      "Email delivery failed. Check SMTP settings.",
    )
  }

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.inviteCreated,
    studioId,
    userId: invitedByUserId,
    metadata: { invitationId, email: invitation.email, role: invitation.role },
  })

  const saved = db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .get()!

  return {
    ...mapInvitation(saved),
    deliveryStatus: "sent",
  }
}

export async function resendInvitation(
  studioId: string,
  invitationId: string,
  actorUserId: string,
): Promise<InvitationSummary> {
  requireVerifiedSmtp(studioId)

  const db = getDrizzle()
  expireStaleInvitations(studioId)

  const invitation = db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.studioId, studioId)))
    .get()

  if (!invitation) {
    throw new TeamServiceError("NOT_FOUND", "Invitation not found.")
  }

  if (invitation.status === "accepted") {
    throw new TeamServiceError("INVITE_ALREADY_USED", "This invitation has already been used.")
  }

  if (invitation.status === "revoked") {
    throw new TeamServiceError("INVITE_REVOKED", "This invitation is no longer valid.")
  }

  const studio = db.select().from(studios).where(eq(studios.id, studioId)).get()
  if (!studio) {
    throw new TeamServiceError("NOT_FOUND", "Studio not found.")
  }

  const token = generateOpaqueToken()
  const now = new Date().toISOString()

  db.update(invitations)
    .set({
      tokenHash: hashToken(token),
      status: "pending",
      expiresAt: getInviteExpiryIso(),
      updatedAt: now,
    })
    .where(eq(invitations.id, invitationId))
    .run()

  const refreshed = db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .get()!

  const deliveryStatus = await deliverInvitationEmail({
    studioId,
    studioName: studio.name || "Playblast Studio",
    invitation: refreshed,
    token,
  })

  if (deliveryStatus === "failed") {
    db.update(invitations)
      .set({ status: "delivery_failed", updatedAt: new Date().toISOString() })
      .where(eq(invitations.id, invitationId))
      .run()

    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.inviteDeliveryFailed,
      studioId,
      userId: actorUserId,
      metadata: { invitationId, email: refreshed.email },
    })

    throw new TeamServiceError(
      "DELIVERY_FAILED",
      "Email delivery failed. Check SMTP settings.",
    )
  }

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.inviteResent,
    studioId,
    userId: actorUserId,
    metadata: { invitationId, email: refreshed.email },
  })

  return mapInvitation(
    db.select().from(invitations).where(eq(invitations.id, invitationId)).get()!,
  )
}

export function revokeInvitation(
  studioId: string,
  invitationId: string,
  actorUserId: string,
): InvitationSummary {
  const db = getDrizzle()
  const invitation = db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.studioId, studioId)))
    .get()

  if (!invitation) {
    throw new TeamServiceError("NOT_FOUND", "Invitation not found.")
  }

  if (invitation.status === "accepted") {
    throw new TeamServiceError("INVITE_ALREADY_USED", "This invitation has already been used.")
  }

  const now = new Date().toISOString()
  db.update(invitations)
    .set({ status: "revoked", updatedAt: now })
    .where(eq(invitations.id, invitationId))
    .run()

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.inviteRevoked,
    studioId,
    userId: actorUserId,
    metadata: { invitationId, email: invitation.email },
  })

  return mapInvitation(
    db.select().from(invitations).where(eq(invitations.id, invitationId)).get()!,
  )
}

export function updateStudioUser(
  studioId: string,
  userId: string,
  actorUserId: string,
  input: UpdateUserRequest,
): UserSummary {
  const db = getDrizzle()
  const user = db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.studioId, studioId)))
    .get()

  if (!user) {
    throw new TeamServiceError("NOT_FOUND", "User not found.")
  }

  if (user.id === actorUserId && input.disabled === true) {
    throw new TeamServiceError("FORBIDDEN", "You cannot disable your own account.")
  }

  const nextRole = input.role ?? user.role
  const nextDisabled = input.disabled ?? user.disabled

  if (input.role && !["admin", "creative", "proofing"].includes(input.role)) {
    throw new TeamServiceError("VALIDATION_FAILED", "Validation failed.", {
      role: ["Role must be admin, creative, or proofing."],
    })
  }

  assertNotLastAdmin(studioId, user.id, user.role, input.role, nextDisabled)

  const now = new Date().toISOString()
  db.update(users)
    .set({
      role: nextRole,
      disabled: nextDisabled,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .run()

  const privilegeReduced =
    nextDisabled ||
    (input.role !== undefined && isPrivilegeReduction(user.role, input.role))

  if (privilegeReduced) {
    destroyAllSessionsForUser(userId)
  }

  if (input.role && input.role !== user.role) {
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.userRoleChanged,
      studioId,
      userId: actorUserId,
      metadata: { targetUserId: userId, fromRole: user.role, toRole: input.role },
    })
  }

  if (input.disabled === true && !user.disabled) {
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.userDisabled,
      studioId,
      userId: actorUserId,
      metadata: { targetUserId: userId },
    })
  }

  if (input.disabled === false && user.disabled) {
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.userReactivated,
      studioId,
      userId: actorUserId,
      metadata: { targetUserId: userId },
    })
  }

  return mapUser(db.select().from(users).where(eq(users.id, userId)).get()!)
}

function findInvitationByToken(token: string) {
  if (!token || token.length < 16) {
    return null
  }

  const db = getDrizzle()
  const rows = db.select().from(invitations).all()

  for (const row of rows) {
    if (verifyTokenHash(token, row.tokenHash)) {
      return row
    }
  }

  return null
}

export function getInvitePreview(token: string): InvitePreviewResponse {
  const invitation = findInvitationByToken(token)
  if (!invitation) {
    throw new TeamServiceError("INVITE_MALFORMED", "This invitation link is invalid.")
  }

  const now = new Date().toISOString()
  if (invitation.status === "revoked") {
    throw new TeamServiceError("INVITE_REVOKED", "This invitation is no longer valid.")
  }

  if (invitation.status === "accepted") {
    throw new TeamServiceError("INVITE_ALREADY_USED", "This invitation has already been used.")
  }

  if (invitation.status === "expired" || invitation.expiresAt <= now) {
    if (invitation.status === "pending") {
      const db = getDrizzle()
      db.update(invitations)
        .set({ status: "expired", updatedAt: now })
        .where(eq(invitations.id, invitation.id))
        .run()
    }
    throw new TeamServiceError("INVITE_EXPIRED", "This invitation has expired.")
  }

  if (invitation.status === "delivery_failed") {
    throw new TeamServiceError(
      "DELIVERY_FAILED",
      "This invitation could not be delivered. Ask your studio admin to resend it.",
    )
  }

  const studio = getDrizzle()
    .select()
    .from(studios)
    .where(eq(studios.id, invitation.studioId))
    .get()

  return {
    studioName: studio?.name || "Playblast Studio",
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  }
}

export async function acceptInvitation(
  token: string,
  input: AcceptInvitationRequest,
  response: Response,
): Promise<AuthSuccessResponse> {
  const details: Record<string, string[]> = {}
  const passwordErrors = validatePasswordPolicy(input.password)
  const confirmErrors = validatePasswordConfirmation(
    input.password,
    input.confirmPassword,
  )

  if (passwordErrors.length) details.password = passwordErrors
  if (confirmErrors.length) details.confirmPassword = confirmErrors

  if (Object.keys(details).length > 0) {
    throw new TeamServiceError("VALIDATION_FAILED", "Validation failed.", details)
  }

  const invitation = findInvitationByToken(token)
  if (!invitation) {
    throw new TeamServiceError("INVITE_MALFORMED", "This invitation link is invalid.")
  }

  const now = new Date().toISOString()

  if (invitation.status === "revoked") {
    throw new TeamServiceError("INVITE_REVOKED", "This invitation is no longer valid.")
  }

  if (invitation.status === "accepted") {
    throw new TeamServiceError("INVITE_ALREADY_USED", "This invitation has already been used.")
  }

  if (invitation.status === "expired" || invitation.expiresAt <= now) {
    throw new TeamServiceError("INVITE_EXPIRED", "This invitation has expired.")
  }

  if (invitation.status !== "pending") {
    throw new TeamServiceError("INVITE_MALFORMED", "This invitation link is invalid.")
  }

  const db = getDrizzle()
  const existingUser = db
    .select()
    .from(users)
    .where(
      and(
        eq(users.studioId, invitation.studioId),
        eq(users.emailNormalized, invitation.emailNormalized),
        eq(users.disabled, false),
      ),
    )
    .get()

  if (existingUser) {
    throw new TeamServiceError(
      "CONFLICT",
      "An account with this email already exists.",
    )
  }

  const passwordHash = await hashPassword(input.password)
  const userId = randomUUID()

  try {
    db.transaction((tx) => {
      const current = tx
        .select()
        .from(invitations)
        .where(eq(invitations.id, invitation.id))
        .get()

      if (!current || current.status !== "pending") {
        throw new TeamServiceError(
          "INVITE_ALREADY_USED",
          "This invitation has already been used.",
        )
      }

      tx.update(invitations)
        .set({ status: "accepted", updatedAt: now })
        .where(
          and(eq(invitations.id, invitation.id), eq(invitations.status, "pending")),
        )
        .run()

      const disabledExisting = tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.studioId, invitation.studioId),
            eq(users.emailNormalized, invitation.emailNormalized),
          ),
        )
        .get()

      if (disabledExisting) {
        tx.update(users)
          .set({
            name: invitation.name,
            email: invitation.email,
            passwordHash,
            role: invitation.role,
            disabled: false,
            updatedAt: now,
          })
          .where(eq(users.id, disabledExisting.id))
          .run()
      } else {
        tx.insert(users)
          .values({
            id: userId,
            studioId: invitation.studioId,
            name: invitation.name,
            email: invitation.email,
            emailNormalized: invitation.emailNormalized,
            passwordHash,
            role: invitation.role,
            disabled: false,
            createdAt: now,
            updatedAt: now,
          })
          .run()
      }
    })
  } catch (error) {
    if (error instanceof TeamServiceError) {
      throw error
    }
    throw new TeamServiceError(
      "INVITE_ALREADY_USED",
      "This invitation has already been used.",
    )
  }

  const createdUser =
    db
      .select()
      .from(users)
      .where(
        and(
          eq(users.studioId, invitation.studioId),
          eq(users.emailNormalized, invitation.emailNormalized),
        ),
      )
      .get() ?? null

  if (!createdUser) {
    throw new TeamServiceError("CONFLICT", "Could not create account.")
  }

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.inviteAccepted,
    studioId: invitation.studioId,
    userId: createdUser.id,
    metadata: { invitationId: invitation.id, role: invitation.role },
  })

  const created = createSession(createdUser.id, invitation.studioId)
  setSessionCookies(
    response,
    created.sessionToken,
    created.csrfToken,
    authConfig.sessionTtlMs,
  )

  return {
    ...created.response,
    csrfToken: created.csrfToken,
  }
}

/** @internal Test helper to locate invitation by email. */
export function __testOnly_getInvitationByEmail(email: string) {
  const db = getDrizzle()
  return db
    .select()
    .from(invitations)
    .where(eq(invitations.emailNormalized, normalizeEmail(email)))
    .get()
}

/** @internal Test helper to count active admins. */
export function __testOnly_countActiveAdmins(studioId: string): number {
  return countActiveAdmins(studioId)
}
