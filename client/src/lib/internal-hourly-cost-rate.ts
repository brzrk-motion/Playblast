import { useSyncExternalStore } from "react"

export const INTERNAL_HOURLY_COST_RATE_STORAGE_KEY =
  "playblast-internal-hourly-cost-rate"

const CHANGE_EVENT = "playblast-internal-hourly-cost-rate-change"

function readStoredRate(): number | null {
  try {
    const raw = localStorage.getItem(INTERNAL_HOURLY_COST_RATE_STORAGE_KEY)
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
    if (event.key === INTERNAL_HOURLY_COST_RATE_STORAGE_KEY) {
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

export function getInternalHourlyCostRate(): number | null {
  return readStoredRate()
}

export function setInternalHourlyCostRate(rate: number | null): void {
  try {
    if (rate === null || rate <= 0) {
      localStorage.removeItem(INTERNAL_HOURLY_COST_RATE_STORAGE_KEY)
    } else {
      localStorage.setItem(
        INTERNAL_HOURLY_COST_RATE_STORAGE_KEY,
        String(rate),
      )
    }
  } catch {
    // storage unavailable
  }

  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useInternalHourlyCostRate(): number | null {
  return useSyncExternalStore(subscribe, readStoredRate, () => null)
}
