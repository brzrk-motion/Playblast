import { createContext } from "react"

import type { FrameAnnotation } from "@/types/annotation"

export interface ComposerState {
  timestamp: number
}

export interface VideoPlayerContextValue {
  currentTime: number
  seek: (timestamp: number) => void
  pause: () => void
  composer: ComposerState | null
  draftAnnotation: FrameAnnotation | null
  openComposer: (timestamp: number) => void
  closeComposer: (options?: { resumePlayback?: boolean }) => void
  setDraftAnnotation: (annotation: FrameAnnotation | null) => void
}

export const VideoPlayerContext = createContext<VideoPlayerContextValue | null>(
  null,
)
