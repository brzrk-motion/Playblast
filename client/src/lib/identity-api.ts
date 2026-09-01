import {
  isApiErrorEnvelope,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type AuthSuccessResponse,
  type ChangePasswordRequest,
  type CreateBootstrapAdminRequest,
  type CurrentSessionResponse,
  type InvitationSummary,
  type LoginRequest,
  type RecoverAdminRequest,
  type RoleCapabilitiesResponse,
  type SetupStatusResponse,
  type StudioProfileResponse,
  type UserSummary,
} from "@playblast/shared"

export class IdentityApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: Record<string, string[]>

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.error)
    this.name = "IdentityApiError"
    this.code = envelope.code
    this.status = status
    this.details = envelope.details
  }
}

function getCsrfTokenFromDocument(): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const match = document.cookie.match(/(?:^|;\s*)playblast_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function buildIdentityHeaders(includeJson = true): HeadersInit {
  const headers: Record<string, string> = {}
  if (includeJson) {
    headers["Content-Type"] = "application/json"
  }

  const csrfToken = getCsrfTokenFromDocument()
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken
  }

  return headers
}

async function parseIdentityResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const body = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    if (isApiErrorEnvelope(body)) {
      throw new IdentityApiError(response.status, body)
    }

    const fallback = (body as { error?: string } | null)?.error
    throw new Error(fallback ?? "Request failed.")
  }

  return body as T
}

async function identityFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...buildIdentityHeaders(init?.body !== undefined),
      ...(init?.headers ?? {}),
    },
  })

  return parseIdentityResponse<T>(response)
}

export async function fetchSetupStatus(): Promise<SetupStatusResponse> {
  return identityFetch<SetupStatusResponse>("/api/setup/status")
}

export async function fetchCurrentSession(): Promise<CurrentSessionResponse> {
  return identityFetch<CurrentSessionResponse>("/api/session")
}

export async function fetchStudioProfile(): Promise<StudioProfileResponse> {
  return identityFetch<StudioProfileResponse>("/api/studio")
}

export async function fetchUsers(): Promise<UserSummary[]> {
  return identityFetch<UserSummary[]>("/api/users")
}

export async function fetchInvitations(): Promise<InvitationSummary[]> {
  return identityFetch<InvitationSummary[]>("/api/invitations")
}

export async function fetchRoleCapabilities(): Promise<RoleCapabilitiesResponse> {
  return identityFetch<RoleCapabilitiesResponse>("/api/capabilities")
}

export async function createBootstrapAdmin(
  input: CreateBootstrapAdminRequest,
): Promise<AuthSuccessResponse> {
  return identityFetch<AuthSuccessResponse>("/api/setup/admin", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function login(input: LoginRequest): Promise<AuthSuccessResponse> {
  return identityFetch<AuthSuccessResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function logout(): Promise<void> {
  await identityFetch<void>("/api/auth/logout", { method: "POST" })
}

export async function changePassword(input: ChangePasswordRequest): Promise<void> {
  await identityFetch<void>("/api/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function recoverAdminPassword(
  input: RecoverAdminRequest,
): Promise<void> {
  await identityFetch<void>("/api/auth/recover-admin", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function isIdentityApiError(error: unknown): error is IdentityApiError {
  return error instanceof IdentityApiError
}
