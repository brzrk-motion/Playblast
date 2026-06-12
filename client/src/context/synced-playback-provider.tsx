import {
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import type { MediaPlayerInstance } from "@vidstack/react"

import {
  SyncedPlaybackContext,
  type ComparePane,
  type SyncedPlaybackEvent,
} from "@/context/synced-playback-context"

function getOtherPane(pane: ComparePane): ComparePane {
  return pane === "left" ? "right" : "left"
}

interface SyncedPlaybackProviderProps {
  children: ReactNode
  syncLocked: boolean
}

export function SyncedPlaybackProvider({
  children,
  syncLocked,
}: SyncedPlaybackProviderProps) {
  const playersRef = useRef<Partial<Record<ComparePane, MediaPlayerInstance>>>(
    {},
  )
  const isSyncingRef = useRef(false)

  const registerPlayer = useCallback(
    (pane: ComparePane, player: MediaPlayerInstance | null) => {
      if (player) {
        playersRef.current[pane] = player
        return
      }

      delete playersRef.current[pane]
    },
    [],
  )

  const handlePlayerEvent = useCallback(
    (source: ComparePane, event: SyncedPlaybackEvent, time?: number) => {
      if (!syncLocked || isSyncingRef.current) {
        return
      }

      const targetPane = getOtherPane(source)
      const sourcePlayer = playersRef.current[source]
      const targetPlayer = playersRef.current[targetPane]

      if (!sourcePlayer || !targetPlayer) {
        return
      }

      isSyncingRef.current = true

      try {
        const remote = targetPlayer.remoteControl

        switch (event) {
          case "play": {
            remote.seek(sourcePlayer.currentTime)
            remote.play()
            break
          }
          case "pause":
            remote.pause()
            break
          case "seeking":
            if (time !== undefined) {
              remote.seeking(time)
            }
            break
          case "seek":
            if (time !== undefined) {
              remote.seek(time)
            }
            break
        }
      } finally {
        requestAnimationFrame(() => {
          isSyncingRef.current = false
        })
      }
    },
    [syncLocked],
  )

  const value = useMemo(
    () => ({
      syncLocked,
      registerPlayer,
      handlePlayerEvent,
    }),
    [handlePlayerEvent, registerPlayer, syncLocked],
  )

  return (
    <SyncedPlaybackContext.Provider value={value}>
      {children}
    </SyncedPlaybackContext.Provider>
  )
}
