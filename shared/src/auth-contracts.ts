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
