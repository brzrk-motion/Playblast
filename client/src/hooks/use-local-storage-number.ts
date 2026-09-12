import { useSyncExternalStore } from "react"

export function createLocalStorageNumberStore(storageKey: string, changeEvent: string) {
  function read(): number | null {
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

  function subscribe(onStoreChange: () => void): () => void {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        onStoreChange()
      }
    }

    const handleCustom = () => onStoreChange()

    window.addEventListener("storage", handleStorage)
    window.addEventListener(changeEvent, handleCustom)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(changeEvent, handleCustom)
    }
  }

  function write(hours: number | null): void {
    try {
      if (hours === null || hours <= 0) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, String(hours))
      }
    } catch {
      // storage unavailable
    }

    window.dispatchEvent(new Event(changeEvent))
  }

  function useValue(): number | null {
    return useSyncExternalStore(subscribe, read, () => null)
  }

  return { read, write, useValue }
}
