/** Canonical audit event type identifiers recorded by the server. */
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
  studioPreferencesUpdated: "studio.preferences_updated",
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

export const AUDIT_EVENT_TYPE_VALUES = Object.values(AUDIT_EVENT_TYPES)

/** Human-readable labels for audit event types shown in the Admin viewer. */
export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  [AUDIT_EVENT_TYPES.bootstrapAdminCreated]: "Bootstrap admin created",
  [AUDIT_EVENT_TYPES.loginSucceeded]: "Login succeeded",
  [AUDIT_EVENT_TYPES.loginFailed]: "Login failed",
  [AUDIT_EVENT_TYPES.logout]: "Logout",
  [AUDIT_EVENT_TYPES.sessionExpired]: "Session expired",
  [AUDIT_EVENT_TYPES.passwordChanged]: "Password changed",
  [AUDIT_EVENT_TYPES.adminRecovered]: "Admin password recovered",
  [AUDIT_EVENT_TYPES.rateLimited]: "Rate limited",
  [AUDIT_EVENT_TYPES.studioProfileUpdated]: "Studio profile updated",
  [AUDIT_EVENT_TYPES.studioAvatarUploaded]: "Studio avatar uploaded",
  [AUDIT_EVENT_TYPES.studioAvatarDeleted]: "Studio avatar deleted",
  [AUDIT_EVENT_TYPES.studioSetupCompleted]: "Studio setup completed",
  [AUDIT_EVENT_TYPES.studioPreferencesUpdated]: "Studio preferences updated",
  [AUDIT_EVENT_TYPES.inviteCreated]: "Invitation created",
  [AUDIT_EVENT_TYPES.inviteResent]: "Invitation resent",
  [AUDIT_EVENT_TYPES.inviteRevoked]: "Invitation revoked",
  [AUDIT_EVENT_TYPES.inviteAccepted]: "Invitation accepted",
  [AUDIT_EVENT_TYPES.inviteDeliveryFailed]: "Invitation delivery failed",
  [AUDIT_EVENT_TYPES.userRoleChanged]: "User role changed",
  [AUDIT_EVENT_TYPES.userDisabled]: "User disabled",
  [AUDIT_EVENT_TYPES.userReactivated]: "User reactivated",
  [AUDIT_EVENT_TYPES.smtpConfigured]: "SMTP configured",
  [AUDIT_EVENT_TYPES.smtpTestSucceeded]: "SMTP test succeeded",
  [AUDIT_EVENT_TYPES.smtpTestFailed]: "SMTP test failed",
}

export function getAuditEventLabel(eventType: string): string {
  return AUDIT_EVENT_LABELS[eventType as AuditEventType] ?? eventType
}

/** Audit event row returned by GET /api/audit-events. */
export interface AuditEventSummary {
  id: string
  eventType: AuditEventType | string
  eventLabel: string
  studioId: string | null
  userId: string | null
  actorName: string | null
  actorEmail: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ListAuditEventsResponse {
  events: AuditEventSummary[]
  total: number
  limit: number
  offset: number
}
