import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import { useMediaRemote, useMediaState } from "@vidstack/react"

import {
  VideoPlayerContext,
  type ComposerState,
} from "@/context/video-player-context"
import type { FrameAnnotation } from "@/types/annotation"

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const remote = useMediaRemote()
  const currentTime = useMediaState("currentTime")
  const paused = useMediaState("paused")
  const wasPlayingBeforeComposerRef = useRef(false)
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [draftAnnotation, setDraftAnnotation] = useState<FrameAnnotation | null>(
    null,
  )

  const seek = useCallback(
    (timestamp: number) => {
      remote.seek(timestamp)
    },
    [remote],
  )

  const pause = useCallback(() => {
    remote.pause()
  }, [remote])

  const openComposer = useCallback(
    (timestamp: number) => {
      wasPlayingBeforeComposerRef.current = !paused
      remote.pause()
      remote.seek(timestamp)
      setComposer({ timestamp })
    },
    [paused, remote],
  )

  const closeComposer = useCallback(
    (options?: { resumePlayback?: boolean }) => {
      const shouldResume =
        options?.resumePlayback && wasPlayingBeforeComposerRef.current
      wasPlayingBeforeComposerRef.current = false

      setComposer(null)
      setDraftAnnotation(null)

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      if (shouldResume) {
        remote.play()
      }
    },
    [remote],
  )

  const value = useMemo(
    () => ({
      currentTime,
      seek,
      pause,
      composer,
      draftAnnotation,
      openComposer,
      closeComposer,
      setDraftAnnotation,
    }),
    [
      closeComposer,
      composer,
      currentTime,
      draftAnnotation,
      openComposer,
      pause,
      seek,
    ],
  )

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  )
}
