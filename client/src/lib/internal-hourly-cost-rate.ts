import {
  ensureStudioPreferencesLoaded,
  readStudioPreferences,
  useStudioPreferencesState,
  writeStudioPreferences,
} from "@/lib/studio-preferences-store"

export async function getInternalHourlyCostRate(): Promise<number | null> {
  const preferences = readStudioPreferences() ?? await ensureStudioPreferencesLoaded()
  return preferences.internalHourlyCostRate
}

export async function setInternalHourlyCostRate(rate: number | null): Promise<void> {
  await writeStudioPreferences({ internalHourlyCostRate: rate })
}

export function useInternalHourlyCostRate(): number | null {
  const state = useStudioPreferencesState()

  if (state.status !== "ready") {
    void ensureStudioPreferencesLoaded()
    return null
  }

  return state.preferences.internalHourlyCostRate
}
