import { createContext } from "react"
import type { MediaPlayerInstance } from "@vidstack/react"

export type ComparePane = "left" | "right"

export type SyncedPlaybackEvent = "play" | "pause" | "seeking" | "seek"

export interface SyncedPlaybackContextValue {
  syncLocked: boolean
  registerPlayer: (pane: ComparePane, player: MediaPlayerInstance | null) => void
  handlePlayerEvent: (
    source: ComparePane,
    event: SyncedPlaybackEvent,
    time?: number,
  ) => void
}

export const SyncedPlaybackContext =
  createContext<SyncedPlaybackContextValue | null>(null)
