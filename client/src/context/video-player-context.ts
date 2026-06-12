import { createContext } from "react"

export interface ComposerState {
  timestamp: number
}

export interface VideoPlayerContextValue {
  currentTime: number
  seek: (timestamp: number) => void
  pause: () => void
  composer: ComposerState | null
  openComposer: (timestamp: number) => void
  closeComposer: () => void
}

export const VideoPlayerContext = createContext<VideoPlayerContextValue | null>(
  null,
)
