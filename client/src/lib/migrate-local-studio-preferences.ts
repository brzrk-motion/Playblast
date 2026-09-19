import type { StudioPreferencesResponse } from "@playblast/shared"
import { INTERNAL_HOURLY_COST_RATE_STORAGE_KEY } from "@/lib/internal-hourly-cost-rate-legacy"
import { WEEKLY_CAPACITY_STORAGE_KEY } from "@/lib/weekly-capacity-legacy"
import { writeStudioPreferences } from "@/lib/studio-preferences-store"

function readLegacyNumber(storageKey: string): number | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }

    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

function clearLegacyValue(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // storage unavailable
  }
}

export async function migrateLocalStudioPreferencesIfNeeded(
  preferences: StudioPreferencesResponse,
): Promise<StudioPreferencesResponse> {
  const legacyRate = readLegacyNumber(INTERNAL_HOURLY_COST_RATE_STORAGE_KEY)
  const legacyCapacity = readLegacyNumber(WEEKLY_CAPACITY_STORAGE_KEY)

  const patch: {
    internalHourlyCostRate?: number
    weeklyCapacityHours?: number
  } = {}

  if (preferences.internalHourlyCostRate === null && legacyRate !== null) {
    patch.internalHourlyCostRate = legacyRate
  }

  if (preferences.weeklyCapacityHours === null && legacyCapacity !== null) {
    patch.weeklyCapacityHours = legacyCapacity
  }

  if (Object.keys(patch).length === 0) {
    return preferences
  }

  const updated = await writeStudioPreferences(patch)

  if (patch.internalHourlyCostRate !== undefined) {
    clearLegacyValue(INTERNAL_HOURLY_COST_RATE_STORAGE_KEY)
  }

  if (patch.weeklyCapacityHours !== undefined) {
    clearLegacyValue(WEEKLY_CAPACITY_STORAGE_KEY)
  }

  return updated
}
