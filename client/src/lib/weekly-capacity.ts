import {
  ensureStudioPreferencesLoaded,
  readStudioPreferences,
  useStudioPreferencesState,
  writeStudioPreferences,
} from "@/lib/studio-preferences-store"

export async function getWeeklyCapacityHours(): Promise<number | null> {
  const preferences = readStudioPreferences() ?? await ensureStudioPreferencesLoaded()
  return preferences.weeklyCapacityHours
}

export async function setWeeklyCapacityHours(hours: number | null): Promise<void> {
  await writeStudioPreferences({ weeklyCapacityHours: hours })
}

export function useWeeklyCapacityHours(): number | null {
  const state = useStudioPreferencesState()

  if (state.status !== "ready") {
    void ensureStudioPreferencesLoaded()
    return null
  }

  return state.preferences.weeklyCapacityHours
}
