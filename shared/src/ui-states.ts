import type { ApiErrorCode } from "./api-error.js"

/** Shared UI state identifiers for MVP surfaces. */
export const UI_STATES = [
  "loading",
  "empty",
  "ready",
  "unauthorized",
  "forbidden",
  "session_expired",
  "invite_expired",
  "validation_error",
  "delivery_failure",
  "offline",
  "server_unavailable",
] as const

export type UiState = (typeof UI_STATES)[number]

export interface UiStateDefinition {
  state: UiState
  title: string
  description: string
  primaryAction?: string
  relatedErrorCodes?: ApiErrorCode[]
}

export const UI_STATE_CATALOG: Record<UiState, UiStateDefinition> = {
  loading: {
    state: "loading",
    title: "Loading",
    description: "Content is being fetched from the server.",
  },
  empty: {
    state: "empty",
    title: "Nothing here yet",
    description: "There is no data to display for this view.",
  },
  ready: {
    state: "ready",
    title: "Ready",
    description: "Primary content is available.",
  },
  unauthorized: {
    state: "unauthorized",
    title: "Sign in required",
    description: "Sign in to access this studio instance.",
    primaryAction: "Go to login",
    relatedErrorCodes: ["UNAUTHENTICATED"],
  },
  forbidden: {
    state: "forbidden",
    title: "Permission denied",
    description: "Your account cannot access this action or page.",
    primaryAction: "Back to dashboard",
    relatedErrorCodes: ["FORBIDDEN", "SETUP_NOT_COMPLETE"],
  },
  session_expired: {
    state: "session_expired",
    title: "Session expired",
    description: "Sign in again to continue working.",
    primaryAction: "Sign in again",
    relatedErrorCodes: ["SESSION_EXPIRED"],
  },
  invite_expired: {
    state: "invite_expired",
    title: "Invitation unavailable",
    description: "This invitation link is expired, revoked, or already used.",
    primaryAction: "Contact your studio admin",
    relatedErrorCodes: ["INVITE_EXPIRED", "INVITE_REVOKED", "INVITE_ALREADY_USED", "INVITE_MALFORMED"],
  },
  validation_error: {
    state: "validation_error",
    title: "Check your input",
    description: "One or more fields need attention before continuing.",
    relatedErrorCodes: ["VALIDATION_FAILED"],
  },
  delivery_failure: {
    state: "delivery_failure",
    title: "Email could not be sent",
    description: "SMTP delivery failed. Verify configuration and try again.",
    primaryAction: "Review SMTP settings",
    relatedErrorCodes: ["DELIVERY_FAILED"],
  },
  offline: {
    state: "offline",
    title: "You appear to be offline",
    description: "Reconnect to continue using Playblast.",
    primaryAction: "Retry",
  },
  server_unavailable: {
    state: "server_unavailable",
    title: "Server unavailable",
    description: "Playblast could not reach the server. Try again shortly.",
    primaryAction: "Retry",
    relatedErrorCodes: ["SERVER_UNAVAILABLE", "RATE_LIMITED"],
  },
}

export function getUiStateForErrorCode(code: ApiErrorCode): UiState | undefined {
  for (const definition of Object.values(UI_STATE_CATALOG)) {
    if (definition.relatedErrorCodes?.includes(code)) {
      return definition.state
    }
  }
  return undefined
}

export const ROLE_BADGE_TOKENS = {
  admin: {
    label: "Admin",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  creative: {
    label: "Creative",
    className: "bg-status-pending-muted text-status-pending-foreground border-status-pending-border",
  },
  proofing: {
    label: "Proofing",
    className: "bg-status-success-muted text-status-success-foreground border-status-success-border",
  },
} as const

export const SETUP_PROGRESS_STEPS = [
  { id: "admin", label: "Admin account" },
  { id: "studio", label: "Studio profile" },
  { id: "smtp", label: "Email (optional)" },
  { id: "team", label: "Invite team" },
] as const

export const DESTRUCTIVE_ACTION_TOKENS = {
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  buttonVariant: "destructive",
  requiresAdminCapability: "data.delete",
} as const

export const RESPONSIVE_BREAKPOINTS = {
  tabletMin: "768px",
  desktopMin: "1024px",
  reviewMinWidth: "1024px",
  setupMaxWidth: "480px",
  loginMaxWidth: "400px",
  teamTableMinWidth: "768px",
} as const
