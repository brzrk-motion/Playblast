import { useSyncExternalStore } from "react"

export const WEEKLY_CAPACITY_STORAGE_KEY = "playblast-weekly-capacity-hours"

const CHANGE_EVENT = "playblast-weekly-capacity-change"

function readStoredCapacity(): number | null {
  try {
    const raw = localStorage.getItem(WEEKLY_CAPACITY_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

function subscribe(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === WEEKLY_CAPACITY_STORAGE_KEY) {
      onStoreChange()
    }
  }

  const handleCustom = () => onStoreChange()

  window.addEventListener("storage", handleStorage)
  window.addEventListener(CHANGE_EVENT, handleCustom)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(CHANGE_EVENT, handleCustom)
  }
}

export function getWeeklyCapacityHours(): number | null {
  return readStoredCapacity()
}

export function setWeeklyCapacityHours(hours: number | null): void {
  try {
    if (hours === null || hours <= 0) {
      localStorage.removeItem(WEEKLY_CAPACITY_STORAGE_KEY)
    } else {
      localStorage.setItem(WEEKLY_CAPACITY_STORAGE_KEY, String(hours))
    }
  } catch {
    // storage unavailable
  }

  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useWeeklyCapacityHours(): number | null {
  return useSyncExternalStore(subscribe, readStoredCapacity, () => null)
}
