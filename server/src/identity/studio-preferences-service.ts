import { hasCapability, type StudioPreferencesResponse, type UpdateStudioPreferencesRequest, type UserRole } from "@playblast/shared"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "../auth/audit.js"
import { getStudioRowById, updateStudioById } from "./repository.js"

export class StudioPreferencesServiceError extends Error {
  constructor(
    readonly code: "VALIDATION_FAILED" | "FORBIDDEN" | "NOT_FOUND",
    readonly message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "StudioPreferencesServiceError"
  }
}

function assertBusinessManageRole(role: UserRole): void {
  if (!hasCapability(role, "business.manage")) {
    throw new StudioPreferencesServiceError("FORBIDDEN", "You don't have permission to do that.")
  }
}

function normalizePositiveNumber(
  value: number | null | undefined,
  field: string,
): number | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new StudioPreferencesServiceError("VALIDATION_FAILED", "Validation failed.", {
      [field]: ["Enter a positive number."],
    })
  }

  return value
}

function toPreferencesResponse(studio: {
  internalHourlyCostRate: number | null
  weeklyCapacityHours: number | null
}): StudioPreferencesResponse {
  return {
    internalHourlyCostRate: studio.internalHourlyCostRate,
    weeklyCapacityHours: studio.weeklyCapacityHours,
  }
}

export function getStudioPreferences(studioId: string, role: UserRole): StudioPreferencesResponse {
  assertBusinessManageRole(role)

  const studio = getStudioRowById(studioId)
  if (!studio) {
    throw new StudioPreferencesServiceError("NOT_FOUND", "Not found.")
  }

  return toPreferencesResponse(studio)
}

export function updateStudioPreferences(
  studioId: string,
  role: UserRole,
  input: UpdateStudioPreferencesRequest,
): StudioPreferencesResponse {
  assertBusinessManageRole(role)

  const studio = getStudioRowById(studioId)
  if (!studio) {
    throw new StudioPreferencesServiceError("NOT_FOUND", "Not found.")
  }

  const internalHourlyCostRate = normalizePositiveNumber(
    input.internalHourlyCostRate,
    "internalHourlyCostRate",
  )
  const weeklyCapacityHours = normalizePositiveNumber(
    input.weeklyCapacityHours,
    "weeklyCapacityHours",
  )

  const updated = updateStudioById(studioId, {
    internalHourlyCostRate,
    weeklyCapacityHours,
  })

  if (!updated) {
    throw new StudioPreferencesServiceError("NOT_FOUND", "Not found.")
  }

  recordAuditEvent({
    eventType: AUDIT_EVENT_TYPES.studioPreferencesUpdated,
    studioId,
    metadata: {
      internalHourlyCostRate: updated.internalHourlyCostRate,
      weeklyCapacityHours: updated.weeklyCapacityHours,
    },
  })

  return toPreferencesResponse(updated)
}
