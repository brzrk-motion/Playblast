import { useEffect, useState } from "react"
import { useMediaRemote, useMediaState } from "@vidstack/react"

import { KeyboardShortcutsPanel } from "@/components/video/keyboard-shortcuts-panel"
import { useVideoPlayer } from "@/hooks/use-video-player"
import {
  FRAME_DURATION_SECONDS,
  SKIP_SECONDS,
} from "@/lib/video-shortcuts"

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  )
}

function isHelpKey(event: KeyboardEvent) {
  return event.key === "?" || (event.code === "Slash" && event.shiftKey)
}

export interface VideoHotkeysProps {
  enableCommentShortcut?: boolean
  onMarkNeedsRevision?: () => void
  onMarkApproved?: () => void
}

export function VideoHotkeys({
  enableCommentShortcut = true,
  onMarkNeedsRevision,
  onMarkApproved,
}: VideoHotkeysProps) {
  const remote = useMediaRemote()
  const currentTime = useMediaState("currentTime")
  const duration = useMediaState("duration")
  const { openComposer } = useVideoPlayer()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const showReviewShortcuts =
    enableCommentShortcut || Boolean(onMarkNeedsRevision || onMarkApproved)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (isHelpKey(event)) {
        event.preventDefault()
        setShortcutsOpen((open) => !open)
        return
      }

      if (shortcutsOpen) {
        return
      }

      switch (event.key) {
        case " ":
          event.preventDefault()
          remote.togglePaused()
          return
        case "j":
        case "J":
          event.preventDefault()
          remote.seek(Math.max(0, currentTime - SKIP_SECONDS))
          return
        case "l":
        case "L":
          event.preventDefault()
          remote.seek(
            duration > 0
              ? Math.min(duration, currentTime + SKIP_SECONDS)
              : currentTime + SKIP_SECONDS,
          )
          return
        case "ArrowLeft":
          event.preventDefault()
          remote.seek(Math.max(0, currentTime - FRAME_DURATION_SECONDS))
          return
        case "ArrowRight":
          event.preventDefault()
          remote.seek(
            duration > 0
              ? Math.min(duration, currentTime + FRAME_DURATION_SECONDS)
              : currentTime + FRAME_DURATION_SECONDS,
          )
          return
        case "c":
        case "C":
          if (!enableCommentShortcut) {
            return
          }
          event.preventDefault()
          openComposer(currentTime)
          return
        case "r":
        case "R":
          if (!onMarkNeedsRevision) {
            return
          }
          event.preventDefault()
          onMarkNeedsRevision()
          return
        case "a":
        case "A":
          if (!onMarkApproved) {
            return
          }
          event.preventDefault()
          onMarkApproved()
          return
        default:
          return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    currentTime,
    duration,
    enableCommentShortcut,
    onMarkApproved,
    onMarkNeedsRevision,
    openComposer,
    remote,
    shortcutsOpen,
  ])

  return (
    <KeyboardShortcutsPanel
      open={shortcutsOpen}
      onOpenChange={setShortcutsOpen}
      showReviewShortcuts={showReviewShortcuts}
    />
  )
}
