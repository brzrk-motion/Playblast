import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useMediaRemote, useMediaState } from "@vidstack/react"

import {
  VideoPlayerContext,
  type ComposerState,
} from "@/context/video-player-context"

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const remote = useMediaRemote()
  const currentTime = useMediaState("currentTime")
  const [composer, setComposer] = useState<ComposerState | null>(null)

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
      remote.pause()
      remote.seek(timestamp)
      setComposer({ timestamp })
    },
    [remote],
  )

  const closeComposer = useCallback(() => {
    setComposer(null)
  }, [])

  const value = useMemo(
    () => ({
      currentTime,
      seek,
      pause,
      composer,
      openComposer,
      closeComposer,
    }),
    [closeComposer, composer, currentTime, openComposer, pause, seek],
  )

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  )
}
