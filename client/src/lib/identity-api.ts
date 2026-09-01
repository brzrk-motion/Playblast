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
  type SmtpSettingsResponse,
  type SmtpTlsMode,
  type StudioProfileResponse,
  type TestSmtpRequest,
  type TestSmtpResponse,
  type UpdateSmtpSettingsRequest,
  type UpdateStudioRequest,
  type UpdateUserRequest,
  type UserSummary,
  type CreateInvitationRequest,
  type InvitationCreatedResponse,
  type InvitePreviewResponse,
  type AcceptInvitationRequest,
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

export async function updateStudioProfile(
  input: UpdateStudioRequest,
): Promise<StudioProfileResponse> {
  return identityFetch<StudioProfileResponse>("/api/studio", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function completeStudioSetup(): Promise<StudioProfileResponse> {
  return identityFetch<StudioProfileResponse>("/api/setup/complete", {
    method: "POST",
  })
}

export interface AvatarUploadProgress {
  loaded: number
  total: number
  percent: number
}

export async function uploadStudioAvatar(
  file: File,
  onProgress?: (progress: AvatarUploadProgress) => void,
): Promise<StudioProfileResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("avatar", file)

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        })
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as StudioProfileResponse)
        return
      }

      try {
        const body = JSON.parse(xhr.responseText) as ApiErrorEnvelope
        if (isApiErrorEnvelope(body)) {
          reject(new IdentityApiError(xhr.status, body))
          return
        }
      } catch {
        // Fall through to generic error.
      }

      reject(new Error("Avatar upload failed."))
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Avatar upload failed."))
    })

    xhr.addEventListener("abort", () => {
      reject(new Error("Avatar upload cancelled."))
    })

    xhr.open("POST", "/api/studio/avatar")
    const headers = buildIdentityHeaders(false) as Record<string, string>
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.withCredentials = true
    xhr.send(formData)
  })
}

export async function deleteStudioAvatar(): Promise<StudioProfileResponse> {
  return identityFetch<StudioProfileResponse>("/api/studio/avatar", {
    method: "DELETE",
  })
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

export async function fetchSmtpSettings(): Promise<SmtpSettingsResponse> {
  return identityFetch<SmtpSettingsResponse>("/api/smtp")
}

export async function updateSmtpSettings(
  input: UpdateSmtpSettingsRequest,
): Promise<SmtpSettingsResponse> {
  return identityFetch<SmtpSettingsResponse>("/api/smtp", {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function testSmtpSettings(
  input: TestSmtpRequest = {},
): Promise<TestSmtpResponse> {
  return identityFetch<TestSmtpResponse>("/api/smtp/test", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createInvitation(
  input: CreateInvitationRequest,
): Promise<InvitationCreatedResponse> {
  return identityFetch<InvitationCreatedResponse>("/api/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function resendInvitation(invitationId: string): Promise<InvitationSummary> {
  return identityFetch<InvitationSummary>(`/api/invitations/${invitationId}/resend`, {
    method: "POST",
  })
}

export async function revokeInvitation(invitationId: string): Promise<InvitationSummary> {
  return identityFetch<InvitationSummary>(`/api/invitations/${invitationId}/revoke`, {
    method: "POST",
  })
}

export async function updateUser(
  userId: string,
  input: UpdateUserRequest,
): Promise<UserSummary> {
  return identityFetch<UserSummary>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function fetchInvitePreview(token: string): Promise<InvitePreviewResponse> {
  return identityFetch<InvitePreviewResponse>(`/api/invites/${encodeURIComponent(token)}`)
}

export async function acceptInvitation(
  token: string,
  input: AcceptInvitationRequest,
): Promise<AuthSuccessResponse> {
  return identityFetch<AuthSuccessResponse>(
    `/api/invites/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  )
}

export type { SmtpTlsMode }

export function isIdentityApiError(error: unknown): error is IdentityApiError {
  return error instanceof IdentityApiError
}
