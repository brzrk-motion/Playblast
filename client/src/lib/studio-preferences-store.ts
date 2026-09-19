import { useSyncExternalStore } from "react"
import type { StudioPreferencesResponse, UpdateStudioPreferencesRequest } from "@playblast/shared"
import {
  fetchStudioPreferences,
  updateStudioPreferences,
} from "@/lib/api-http"

const CHANGE_EVENT = "playblast-studio-preferences-change"

type StudioPreferencesState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; preferences: StudioPreferencesResponse }
  | { status: "error" }

let state: StudioPreferencesState = { status: "idle" }
let loadPromise: Promise<StudioPreferencesResponse> | null = null

function emitChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onStoreChange: () => void): () => void {
  const handleChange = () => onStoreChange()
  window.addEventListener(CHANGE_EVENT, handleChange)
  return () => window.removeEventListener(CHANGE_EVENT, handleChange)
}

function getSnapshot(): StudioPreferencesState {
  return state
}

function setState(next: StudioPreferencesState): void {
  state = next
  emitChange()
}

export async function ensureStudioPreferencesLoaded(): Promise<StudioPreferencesResponse> {
  if (state.status === "ready") {
    return state.preferences
  }

  if (!loadPromise) {
    setState({ status: "loading" })
    loadPromise = fetchStudioPreferences()
      .then((preferences) => {
        setState({ status: "ready", preferences })
        return preferences
      })
      .catch(() => {
        setState({ status: "error" })
        throw new Error("Could not load studio preferences.")
      })
      .finally(() => {
        loadPromise = null
      })
  }

  return loadPromise
}

export function readStudioPreferences(): StudioPreferencesResponse | null {
  return state.status === "ready" ? state.preferences : null
}

export async function writeStudioPreferences(
  patch: UpdateStudioPreferencesRequest,
): Promise<StudioPreferencesResponse> {
  const updated = await updateStudioPreferences(patch)
  setState({ status: "ready", preferences: updated })
  return updated
}

export function useStudioPreferencesState(): StudioPreferencesState {
  return useSyncExternalStore(subscribe, getSnapshot, () => ({ status: "idle" }))
}
