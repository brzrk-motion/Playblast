import { useContext } from "react"

import { SyncedPlaybackContext } from "@/context/synced-playback-context"

export function useSyncedPlayback() {
  const context = useContext(SyncedPlaybackContext)
  if (!context) {
    throw new Error("useSyncedPlayback must be used within SyncedPlaybackProvider")
  }

  return context
}
