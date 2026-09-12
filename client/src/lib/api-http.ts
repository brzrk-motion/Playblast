import {
  isApiErrorEnvelope,
  type AcceptInvitationRequest,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type AuthSuccessResponse,
  type ChangePasswordRequest,
  type CreateBootstrapAdminRequest,
  type CreateInvitationRequest,
  type CurrentSessionResponse,
  type InvitationCreatedResponse,
  type InvitationSummary,
  type InvitePreviewResponse,
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
} from "@playblast/shared"

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: Record<string, string[]>

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.error)
    this.name = "ApiError"
    this.code = envelope.code
    this.status = status
    this.details = envelope.details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function getCsrfTokenFromDocument(): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const match = document.cookie.match(/(?:^|;\s*)playblast_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function buildApiHeaders(includeJson = true): HeadersInit {
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

function humanizeHttpError(status: number, serverMessage?: string): string {
  if (serverMessage) {
    return serverMessage
  }

  switch (status) {
    case 400:
      return "Invalid request."
    case 401:
      return "Sign in required."
    case 403:
      return "You don't have permission to do that."
    case 404:
      return "Not found."
    case 409:
      return "This action conflicts with existing data."
    case 413:
      return "File is too large."
    case 500:
      return "Something went wrong on our end."
    default:
      return "Something went wrong. Please try again."
  }
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const body = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    if (isApiErrorEnvelope(body)) {
      throw new ApiError(response.status, body)
    }

    const fallback = (body as { error?: string } | null)?.error
    throw new Error(humanizeHttpError(response.status, fallback))
  }

  return body as T
}

export async function expectApiOk(response: Response): Promise<void> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as unknown
    if (isApiErrorEnvelope(body)) {
      throw new ApiError(response.status, body)
    }

    const fallback = (body as { error?: string } | null)?.error
    throw new Error(humanizeHttpError(response.status, fallback))
  }
}

export function redirectOnSessionExpired(error: unknown): boolean {
  if (typeof window === "undefined") {
    return false
  }

  if (error instanceof ApiError && (error.code === "SESSION_EXPIRED" || error.status === 401)) {
    window.location.assign("/session-expired")
    return true
  }

  return false
}

export function getForbiddenMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.code === "FORBIDDEN") {
    return error.message
  }

  return null
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...buildApiHeaders(init?.body !== undefined),
      ...(init?.headers ?? {}),
    },
  })

  return parseApiResponse<T>(response)
}

export async function fetchSetupStatus(): Promise<SetupStatusResponse> {
  return apiFetch<SetupStatusResponse>("/api/setup/status")
}

export async function fetchCurrentSession(): Promise<CurrentSessionResponse> {
  return apiFetch<CurrentSessionResponse>("/api/session")
}

export async function fetchStudioProfile(): Promise<StudioProfileResponse> {
  return apiFetch<StudioProfileResponse>("/api/studio")
}

export async function updateStudioProfile(
  input: UpdateStudioRequest,
): Promise<StudioProfileResponse> {
  return apiFetch<StudioProfileResponse>("/api/studio", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function completeStudioSetup(): Promise<StudioProfileResponse> {
  return apiFetch<StudioProfileResponse>("/api/setup/complete", {
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
        const body = JSON.parse(xhr.responseText)
        if (isApiErrorEnvelope(body)) {
          reject(new ApiError(xhr.status, body))
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
    const headers = buildApiHeaders(false) as Record<string, string>
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.withCredentials = true
    xhr.send(formData)
  })
}

export async function deleteStudioAvatar(): Promise<StudioProfileResponse> {
  return apiFetch<StudioProfileResponse>("/api/studio/avatar", {
    method: "DELETE",
  })
}

export async function fetchUsers(): Promise<UserSummary[]> {
  return apiFetch<UserSummary[]>("/api/users")
}

export async function fetchInvitations(): Promise<InvitationSummary[]> {
  return apiFetch<InvitationSummary[]>("/api/invitations")
}

export async function fetchRoleCapabilities(): Promise<RoleCapabilitiesResponse> {
  return apiFetch<RoleCapabilitiesResponse>("/api/capabilities")
}

export async function createBootstrapAdmin(
  input: CreateBootstrapAdminRequest,
): Promise<AuthSuccessResponse> {
  return apiFetch<AuthSuccessResponse>("/api/setup/admin", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function login(input: LoginRequest): Promise<AuthSuccessResponse> {
  return apiFetch<AuthSuccessResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" })
}

export async function changePassword(input: ChangePasswordRequest): Promise<void> {
  await apiFetch<void>("/api/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function recoverAdminPassword(input: RecoverAdminRequest): Promise<void> {
  await apiFetch<void>("/api/auth/recover-admin", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function fetchSmtpSettings(): Promise<SmtpSettingsResponse> {
  return apiFetch<SmtpSettingsResponse>("/api/smtp")
}

export async function updateSmtpSettings(
  input: UpdateSmtpSettingsRequest,
): Promise<SmtpSettingsResponse> {
  return apiFetch<SmtpSettingsResponse>("/api/smtp", {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function testSmtpSettings(
  input: TestSmtpRequest = {},
): Promise<TestSmtpResponse> {
  return apiFetch<TestSmtpResponse>("/api/smtp/test", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createInvitation(
  input: CreateInvitationRequest,
): Promise<InvitationCreatedResponse> {
  return apiFetch<InvitationCreatedResponse>("/api/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function resendInvitation(invitationId: string): Promise<InvitationSummary> {
  return apiFetch<InvitationSummary>(`/api/invitations/${invitationId}/resend`, {
    method: "POST",
  })
}

export async function revokeInvitation(invitationId: string): Promise<InvitationSummary> {
  return apiFetch<InvitationSummary>(`/api/invitations/${invitationId}/revoke`, {
    method: "POST",
  })
}

export async function updateUser(
  userId: string,
  input: UpdateUserRequest,
): Promise<UserSummary> {
  return apiFetch<UserSummary>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function fetchInvitePreview(token: string): Promise<InvitePreviewResponse> {
  return apiFetch<InvitePreviewResponse>(`/api/invites/${encodeURIComponent(token)}`)
}

export async function acceptInvitation(
  token: string,
  input: AcceptInvitationRequest,
): Promise<AuthSuccessResponse> {
  return apiFetch<AuthSuccessResponse>(
    `/api/invites/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  )
}

export type { SmtpTlsMode }
