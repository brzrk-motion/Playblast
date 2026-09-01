import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import type {
  AuthSuccessResponse,
  ChangePasswordRequest,
  CreateBootstrapAdminRequest,
  LoginRequest,
  RecoverAdminRequest,
} from "@playblast/shared"
import { getDrizzle } from "../db/drizzle.js"
import { studios, users } from "../db/schema/identity.js"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "../auth/audit.js"
import { authConfig } from "../auth/config.js"
import { setSessionCookies, clearSessionCookies } from "../auth/cookies.js"
import {
  hashPassword,
  normalizeEmail,
  validatePasswordConfirmation,
  validatePasswordPolicy,
  verifyPassword,
} from "../auth/password.js"
import {
  createSession,
  destroyAllSessionsForUser,
  destroySessionByToken,
} from "../auth/session.js"
import type { Response } from "express"

export class AuthServiceError extends Error {
  constructor(
    readonly code:
      | "VALIDATION_FAILED"
      | "SETUP_ALREADY_COMPLETE"
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "CONFLICT",
    readonly message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "AuthServiceError"
  }
}

const GENERIC_LOGIN_ERROR = "Invalid email or password."

function validateName(name: string): string[] {
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return ["Name must be at least 2 characters."]
  }

  if (trimmed.length > 120) {
    return ["Name must be 120 characters or fewer."]
  }

  return []
}

function validateEmail(email: string): string[] {
  const trimmed = email.trim()
  if (!trimmed) {
    return ["Email is required."]
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return ["Enter a valid email address."]
  }

  return []
}

function writeAuthSuccess(
  response: Response,
  created: ReturnType<typeof createSession>,
): AuthSuccessResponse {
  setSessionCookies(
    response,
    created.sessionToken,
    created.csrfToken,
    authConfig.sessionTtlMs,
  )

  return {
    ...created.response,
    csrfToken: created.csrfToken,
  }
}

export async function createBootstrapAdmin(
  input: CreateBootstrapAdminRequest,
  response: Response,
): Promise<AuthSuccessResponse> {
  const details: Record<string, string[]> = {}
  const nameErrors = validateName(input.name)
  const emailErrors = validateEmail(input.email)
  const passwordErrors = validatePasswordPolicy(input.password)
  const confirmErrors = validatePasswordConfirmation(
    input.password,
    input.confirmPassword,
  )

  if (nameErrors.length) details.name = nameErrors
  if (emailErrors.length) details.email = emailErrors
  if (passwordErrors.length) details.password = passwordErrors
  if (confirmErrors.length) details.confirmPassword = confirmErrors

  if (Object.keys(details).length > 0) {
    throw new AuthServiceError("VALIDATION_FAILED", "Validation failed.", details)
  }

  const emailNormalized = normalizeEmail(input.email)
  const passwordHash = await hashPassword(input.password)
  const now = new Date().toISOString()

  const db = getDrizzle()
  let createdUserId = ""
  let createdStudioId = ""

  try {
    db.transaction((tx) => {
      const existingStudio = tx.select().from(studios).limit(1).get()
      if (existingStudio && existingStudio.setupStatus !== "pending") {
        throw new AuthServiceError(
          "SETUP_ALREADY_COMPLETE",
          "Setup has already been completed.",
        )
      }

      const existingUsers = tx.select().from(users).all()
      if (existingUsers.length > 0) {
        throw new AuthServiceError(
          "SETUP_ALREADY_COMPLETE",
          "Setup has already been completed.",
        )
      }

      const existingEmail = tx
        .select()
        .from(users)
        .where(eq(users.emailNormalized, emailNormalized))
        .get()
      if (existingEmail) {
        throw new AuthServiceError("CONFLICT", "An account with this email already exists.")
      }

      const studioId = existingStudio?.id ?? randomUUID()
      if (!existingStudio) {
        tx.insert(studios)
          .values({
            id: studioId,
            name: "",
            avatarPath: null,
            setupStatus: "admin_created",
            createdAt: now,
            updatedAt: now,
          })
          .run()
      } else {
        tx.update(studios)
          .set({ setupStatus: "admin_created", updatedAt: now })
          .where(eq(studios.id, studioId))
          .run()
      }

      const userId = randomUUID()
      tx.insert(users)
        .values({
          id: userId,
          studioId,
          name: input.name.trim(),
          email: input.email.trim(),
          emailNormalized,
          passwordHash,
          role: "admin",
          disabled: false,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      createdUserId = userId
      createdStudioId = studioId
    })

    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.bootstrapAdminCreated,
      studioId: createdStudioId,
      userId: createdUserId,
      metadata: { email: input.email.trim() },
    })

    const created = createSession(createdUserId, createdStudioId)
    return writeAuthSuccess(response, created)
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error
    }

    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("UNIQUE constraint failed")) {
      throw new AuthServiceError(
        "SETUP_ALREADY_COMPLETE",
        "Setup has already been completed.",
      )
    }

    throw error
  }
}

export async function loginUser(
  input: LoginRequest,
  response: Response,
): Promise<AuthSuccessResponse> {
  const details: Record<string, string[]> = {}
  const emailErrors = validateEmail(input.email)
  if (emailErrors.length) details.email = emailErrors
  if (!input.password) details.password = ["Password is required."]

  if (Object.keys(details).length > 0) {
    throw new AuthServiceError("VALIDATION_FAILED", "Validation failed.", details)
  }

  const emailNormalized = normalizeEmail(input.email)
  const db = getDrizzle()
  const user = db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .get()

  const passwordValid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : false

  if (!user || !passwordValid || user.disabled) {
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.loginFailed,
      studioId: user?.studioId ?? null,
      userId: user?.id ?? null,
      metadata: { email: input.email.trim() },
    })
    throw new AuthServiceError("UNAUTHENTICATED", GENERIC_LOGIN_ERROR)
  }

  const created = createSession(user.id, user.studioId)
  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.loginSucceeded,
    studioId: user.studioId,
    userId: user.id,
  })

  return writeAuthSuccess(response, created)
}

export function logoutUser(sessionToken: string | null, response: Response): void {
  const destroyed = destroySessionByToken(sessionToken)
  clearSessionCookies(response)

  if (destroyed) {
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.logout,
    })
  }
}

export async function changePassword(
  userId: string,
  input: ChangePasswordRequest,
): Promise<void> {
  const details: Record<string, string[]> = {}
  const passwordErrors = validatePasswordPolicy(input.newPassword)
  const confirmErrors = validatePasswordConfirmation(
    input.newPassword,
    input.confirmPassword,
  )

  if (!input.currentPassword) {
    details.currentPassword = ["Current password is required."]
  }
  if (passwordErrors.length) details.newPassword = passwordErrors
  if (confirmErrors.length) details.confirmPassword = confirmErrors

  if (Object.keys(details).length > 0) {
    throw new AuthServiceError("VALIDATION_FAILED", "Validation failed.", details)
  }

  const db = getDrizzle()
  const user = db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) {
    throw new AuthServiceError("UNAUTHENTICATED", GENERIC_LOGIN_ERROR)
  }

  const currentValid = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!currentValid) {
    throw new AuthServiceError("UNAUTHENTICATED", "Current password is incorrect.")
  }

  const passwordHash = await hashPassword(input.newPassword)
  const now = new Date().toISOString()

  db.update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, userId))
    .run()

  destroyAllSessionsForUser(userId)

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.passwordChanged,
    studioId: user.studioId,
    userId: user.id,
  })
}

export async function recoverAdminPassword(
  input: RecoverAdminRequest,
): Promise<void> {
  if (!process.env.PLAYBLAST_ADMIN_RECOVERY_TOKEN) {
    throw new AuthServiceError(
      "FORBIDDEN",
      "Admin recovery is not configured for this instance.",
    )
  }

  if (!authConfig.verifyAdminRecoveryToken(input.recoveryToken)) {
    throw new AuthServiceError("FORBIDDEN", "Invalid recovery token.")
  }

  const details: Record<string, string[]> = {}
  const emailErrors = validateEmail(input.email)
  const passwordErrors = validatePasswordPolicy(input.newPassword)
  const confirmErrors = validatePasswordConfirmation(
    input.newPassword,
    input.confirmPassword,
  )

  if (emailErrors.length) details.email = emailErrors
  if (passwordErrors.length) details.password = passwordErrors
  if (confirmErrors.length) details.confirmPassword = confirmErrors

  if (Object.keys(details).length > 0) {
    throw new AuthServiceError("VALIDATION_FAILED", "Validation failed.", details)
  }

  const emailNormalized = normalizeEmail(input.email)
  const db = getDrizzle()
  const user = db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .get()

  if (!user || user.role !== "admin") {
    throw new AuthServiceError("FORBIDDEN", "Recovery is only available for admin accounts.")
  }

  const passwordHash = await hashPassword(input.newPassword)
  const now = new Date().toISOString()

  db.update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, user.id))
    .run()

  destroyAllSessionsForUser(user.id)

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.adminRecovered,
    studioId: user.studioId,
    userId: user.id,
  })
}
