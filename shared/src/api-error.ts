/**
 * Canonical API error envelope and status-code conventions for the MVP.
 * Phase 1+ routes must return this shape for machine-readable client handling.
 */
export const API_ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "INVITE_EXPIRED",
  "INVITE_REVOKED",
  "INVITE_ALREADY_USED",
  "INVITE_MALFORMED",
  "DELIVERY_FAILED",
  "SETUP_ALREADY_COMPLETE",
  "SETUP_NOT_COMPLETE",
  "RATE_LIMITED",
  "SERVER_UNAVAILABLE",
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorEnvelope {
  error: string
  code: ApiErrorCode
  details?: Record<string, string[]>
}

export interface ApiErrorStatusMapping {
  status: number
  defaultMessage: string
}

export const API_ERROR_STATUS: Record<ApiErrorCode, ApiErrorStatusMapping> = {
  VALIDATION_FAILED: { status: 400, defaultMessage: "Validation failed." },
  UNAUTHENTICATED: { status: 401, defaultMessage: "Sign in required." },
  SESSION_EXPIRED: { status: 401, defaultMessage: "Your session has expired. Sign in again." },
  FORBIDDEN: { status: 403, defaultMessage: "You don't have permission to do that." },
  NOT_FOUND: { status: 404, defaultMessage: "Not found." },
  CONFLICT: { status: 409, defaultMessage: "This action conflicts with existing data." },
  PAYLOAD_TOO_LARGE: { status: 413, defaultMessage: "File is too large." },
  INVITE_EXPIRED: { status: 410, defaultMessage: "This invitation has expired." },
  INVITE_REVOKED: { status: 410, defaultMessage: "This invitation is no longer valid." },
  INVITE_ALREADY_USED: { status: 409, defaultMessage: "This invitation has already been used." },
  INVITE_MALFORMED: { status: 400, defaultMessage: "This invitation link is invalid." },
  DELIVERY_FAILED: { status: 502, defaultMessage: "Email delivery failed. Check SMTP settings." },
  SETUP_ALREADY_COMPLETE: { status: 409, defaultMessage: "Setup has already been completed." },
  SETUP_NOT_COMPLETE: { status: 403, defaultMessage: "Complete setup before accessing the application." },
  RATE_LIMITED: { status: 429, defaultMessage: "Too many attempts. Try again later." },
  SERVER_UNAVAILABLE: { status: 503, defaultMessage: "The server is temporarily unavailable." },
}

export function createApiError(
  code: ApiErrorCode,
  message?: string,
  details?: Record<string, string[]>,
): ApiErrorEnvelope {
  return {
    error: message ?? API_ERROR_STATUS[code].defaultMessage,
    code,
    ...(details ? { details } : {}),
  }
}

export function getHttpStatusForErrorCode(code: ApiErrorCode): number {
  return API_ERROR_STATUS[code].status
}

export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<ApiErrorEnvelope>
  return (
    typeof candidate.error === "string" &&
    typeof candidate.code === "string" &&
    (API_ERROR_CODES as readonly string[]).includes(candidate.code)
  )
}
