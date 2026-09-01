import { randomUUID } from "node:crypto"
import { getDrizzle } from "../db/drizzle.js"
import { auditEvents } from "../db/schema/identity.js"

export const AUDIT_EVENT_TYPES = {
  bootstrapAdminCreated: "auth.bootstrap_admin_created",
  loginSucceeded: "auth.login_succeeded",
  loginFailed: "auth.login_failed",
  logout: "auth.logout",
  sessionExpired: "auth.session_expired",
  passwordChanged: "auth.password_changed",
  adminRecovered: "auth.admin_recovered",
  rateLimited: "auth.rate_limited",
  studioProfileUpdated: "studio.profile_updated",
  studioAvatarUploaded: "studio.avatar_uploaded",
  studioAvatarDeleted: "studio.avatar_deleted",
  studioSetupCompleted: "studio.setup_completed",
  inviteCreated: "team.invite_created",
  inviteResent: "team.invite_resent",
  inviteRevoked: "team.invite_revoked",
  inviteAccepted: "team.invite_accepted",
  inviteDeliveryFailed: "team.invite_delivery_failed",
  userRoleChanged: "team.user_role_changed",
  userDisabled: "team.user_disabled",
  userReactivated: "team.user_reactivated",
  smtpConfigured: "smtp.configured",
  smtpTestSucceeded: "smtp.test_succeeded",
  smtpTestFailed: "smtp.test_failed",
} as const

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[keyof typeof AUDIT_EVENT_TYPES]

export function recordAuditEvent(input: {
  eventType: AuditEventType
  studioId?: string | null
  userId?: string | null
  metadata?: Record<string, unknown>
}): void {
  const db = getDrizzle()
  const now = new Date().toISOString()

  db.insert(auditEvents)
    .values({
      id: randomUUID(),
      studioId: input.studioId ?? null,
      userId: input.userId ?? null,
      eventType: input.eventType,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: now,
    })
    .run()
}
