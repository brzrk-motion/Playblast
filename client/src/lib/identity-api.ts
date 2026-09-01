import {
  isApiErrorEnvelope,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type CurrentSessionResponse,
  type InvitationSummary,
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

async function parseIdentityResponse<T>(response: Response): Promise<T> {
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

export async function fetchSetupStatus(): Promise<SetupStatusResponse> {
  const response = await fetch("/api/setup/status")
  return parseIdentityResponse<SetupStatusResponse>(response)
}

export async function fetchCurrentSession(): Promise<CurrentSessionResponse> {
  const response = await fetch("/api/session")
  return parseIdentityResponse<CurrentSessionResponse>(response)
}

export async function fetchStudioProfile(): Promise<StudioProfileResponse> {
  const response = await fetch("/api/studio")
  return parseIdentityResponse<StudioProfileResponse>(response)
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const response = await fetch("/api/users")
  return parseIdentityResponse<UserSummary[]>(response)
}

export async function fetchInvitations(): Promise<InvitationSummary[]> {
  const response = await fetch("/api/invitations")
  return parseIdentityResponse<InvitationSummary[]>(response)
}

export async function fetchRoleCapabilities(): Promise<RoleCapabilitiesResponse> {
  const response = await fetch("/api/capabilities")
  return parseIdentityResponse<RoleCapabilitiesResponse>(response)
}

export function isIdentityApiError(error: unknown): error is IdentityApiError {
  return error instanceof IdentityApiError
}
