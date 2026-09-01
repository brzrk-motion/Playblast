import fs from "node:fs"
import { randomUUID } from "node:crypto"
import path from "node:path"
import type { SetupStatus, StudioProfileResponse, UpdateStudioRequest, UserRole } from "@playblast/shared"
import { STUDIO_AVATAR_POLICY } from "@playblast/shared"
import {
  ensureStudioAvatarDir,
  resolveStoredAvatarPath,
} from "../config/paths.js"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "../auth/audit.js"
import {
  detectImageType,
  isAllowedAvatarMimeType,
  normalizeStudioName,
  validateStudioName,
} from "./studio-validation.js"
import {
  getStudioProfile,
  getStudioRowById,
  updateStudioById,
} from "./repository.js"

export class StudioServiceError extends Error {
  constructor(
    readonly code:
      | "VALIDATION_FAILED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "PAYLOAD_TOO_LARGE"
      | "CONFLICT",
    readonly message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "StudioServiceError"
  }
}

export interface AvatarUploadInput {
  buffer: Buffer
  mimeType: string
  size: number
}

function assertAdminRole(role: UserRole): void {
  if (role !== "admin") {
    throw new StudioServiceError("FORBIDDEN", "You don't have permission to do that.")
  }
}

function buildAvatarUrl(avatarPath: string | null): string | null {
  return avatarPath ? "/api/studio/avatar" : null
}

function nextSetupStatusAfterNameUpdate(current: SetupStatus): SetupStatus {
  if (current === "admin_created") {
    return "studio_configured"
  }

  return current
}

function removeAvatarFile(relativePath: string | null): void {
  if (!relativePath) {
    return
  }

  const absolutePath = resolveStoredAvatarPath(relativePath)
  if (!absolutePath) {
    return
  }

  try {
    fs.unlinkSync(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }
}

export function updateStudioProfile(
  studioId: string,
  role: UserRole,
  input: UpdateStudioRequest,
): StudioProfileResponse {
  assertAdminRole(role)

  const studio = getStudioRowById(studioId)
  if (!studio) {
    throw new StudioServiceError("NOT_FOUND", "Not found.")
  }

  const nameErrors = validateStudioName(input.name)
  if (nameErrors.length > 0) {
    throw new StudioServiceError("VALIDATION_FAILED", "Validation failed.", {
      name: nameErrors,
    })
  }

  const normalizedName = normalizeStudioName(input.name)
  const setupStatus = nextSetupStatusAfterNameUpdate(studio.setupStatus)
  const updated = updateStudioById(studioId, {
    name: normalizedName,
    setupStatus,
  })

  if (!updated) {
    throw new StudioServiceError("NOT_FOUND", "Not found.")
  }

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.studioProfileUpdated,
    studioId,
    metadata: { setupStatus },
  })

  return getStudioProfile()!
}

export function uploadStudioAvatar(
  studioId: string,
  role: UserRole,
  input: AvatarUploadInput,
): StudioProfileResponse {
  assertAdminRole(role)

  const studio = getStudioRowById(studioId)
  if (!studio) {
    throw new StudioServiceError("NOT_FOUND", "Not found.")
  }

  if (input.size > STUDIO_AVATAR_POLICY.maxSizeBytes) {
    throw new StudioServiceError("PAYLOAD_TOO_LARGE", "File is too large.")
  }

  if (!isAllowedAvatarMimeType(input.mimeType)) {
    throw new StudioServiceError("VALIDATION_FAILED", "Validation failed.", {
      avatar: ["Only JPEG, PNG, WebP, and GIF images are allowed."],
    })
  }

  const detected = detectImageType(input.buffer)
  if (!detected || detected.mimeType !== input.mimeType) {
    throw new StudioServiceError("VALIDATION_FAILED", "Validation failed.", {
      avatar: ["The uploaded file is not a supported image."],
    })
  }

  const filename = `${randomUUID()}.${detected.extension}`
  const avatarDir = ensureStudioAvatarDir(studioId)
  const absolutePath = path.join(avatarDir, filename)
  const relativePath = path.posix.join("avatars", studioId, filename)

  if (!resolveStoredAvatarPath(relativePath)) {
    throw new StudioServiceError("VALIDATION_FAILED", "Validation failed.", {
      avatar: ["Invalid avatar path."],
    })
  }

  const previousPath = studio.avatarPath
  fs.writeFileSync(absolutePath, input.buffer)

  try {
    updateStudioById(studioId, { avatarPath: relativePath })
    removeAvatarFile(previousPath)
  } catch (error) {
    try {
      fs.unlinkSync(absolutePath)
    } catch {
      // Best-effort cleanup after failed metadata update.
    }
    throw error
  }

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.studioAvatarUploaded,
    studioId,
  })

  return getStudioProfile()!
}

export function deleteStudioAvatar(
  studioId: string,
  role: UserRole,
): StudioProfileResponse {
  assertAdminRole(role)

  const studio = getStudioRowById(studioId)
  if (!studio) {
    throw new StudioServiceError("NOT_FOUND", "Not found.")
  }

  if (!studio.avatarPath) {
    return getStudioProfile()!
  }

  removeAvatarFile(studio.avatarPath)
  updateStudioById(studioId, { avatarPath: null })

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.studioAvatarDeleted,
    studioId,
  })

  return getStudioProfile()!
}

export function completeStudioSetup(
  studioId: string,
  role: UserRole,
): StudioProfileResponse {
  assertAdminRole(role)

  const studio = getStudioRowById(studioId)
  if (!studio) {
    throw new StudioServiceError("NOT_FOUND", "Not found.")
  }

  if (studio.setupStatus === "complete") {
    return getStudioProfile()!
  }

  if (studio.setupStatus !== "studio_configured") {
    throw new StudioServiceError("CONFLICT", "Complete studio profile setup first.")
  }

  if (!studio.name.trim()) {
    throw new StudioServiceError("VALIDATION_FAILED", "Validation failed.", {
      name: ["Studio name is required before finishing setup."],
    })
  }

  updateStudioById(studioId, { setupStatus: "complete" })

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.studioSetupCompleted,
    studioId,
  })

  return getStudioProfile()!
}

export function getStudioAvatarAbsolutePath(studioId: string): string | null {
  const studio = getStudioRowById(studioId)
  if (!studio?.avatarPath) {
    return null
  }

  const absolutePath = resolveStoredAvatarPath(studio.avatarPath)
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return null
  }

  return absolutePath
}

export function getStudioAvatarUrl(avatarPath: string | null): string | null {
  return buildAvatarUrl(avatarPath)
}
