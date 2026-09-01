import type { CurrentSessionResponse } from "./identity.js"

/** Password policy enforced during setup, login recovery, and password change. */
export const PASSWORD_POLICY = {
  minLength: 12,
  requireLetter: true,
  requireNumber: true,
} as const

export interface CreateBootstrapAdminRequest {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface RecoverAdminRequest {
  recoveryToken: string
  email: string
  newPassword: string
  confirmPassword: string
}

export interface AuthSuccessResponse extends CurrentSessionResponse {
  csrfToken: string
}

/** Studio name policy enforced during setup and profile updates. */
export const STUDIO_NAME_POLICY = {
  minLength: 2,
  maxLength: 120,
} as const

/** Studio avatar upload policy. */
export const STUDIO_AVATAR_POLICY = {
  maxSizeBytes: 2 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as const,
} as const

export interface UpdateStudioRequest {
  name: string
}
