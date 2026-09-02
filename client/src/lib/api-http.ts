import { isApiErrorEnvelope, type ApiErrorCode, type ApiErrorEnvelope } from "@playblast/shared"

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
