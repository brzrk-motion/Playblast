import { useEffect, useRef, useState } from "react"
import { useMediaRemote, useMediaState } from "@vidstack/react"

import { KeyboardShortcutsPanel } from "@/components/video/keyboard-shortcuts-panel"
import { useVideoPlayer } from "@/hooks/use-video-player"
import {
  FRAME_DURATION_SECONDS,
  SKIP_SECONDS,
} from "@/lib/video-shortcuts"

/**
 * Skip player shortcuts when the user is interacting with a form field or any
 * other interactive control (buttons, links, menus, sliders). Otherwise keys
 * like Space and the arrows would hijack normal keyboard navigation.
 */
function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName
  if (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  ) {
    return true
  }

  return Boolean(
    target.closest(
      'button, a[href], [role="button"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="slider"], [role="menu"], [role="dialog"]',
    ),
  )
}

function isHelpKey(event: KeyboardEvent) {
  return event.key === "?" || (event.code === "Slash" && event.shiftKey)
}

export interface VideoHotkeysProps {
  enableCommentShortcut?: boolean
  /**
   * Whether this instance registers the global (window-level) keyboard
   * listener. On the compare page only one pane should capture shortcuts so a
   * single key press does not toggle both players independently.
   */
  captureShortcuts?: boolean
  onMarkNeedsRevision?: () => void
  onMarkApproved?: () => void
  onToggleCommentsPanel?: () => void
  onToggleFocusMode?: () => void
  focusMode?: boolean
}

export function VideoHotkeys({
  enableCommentShortcut = true,
  captureShortcuts = true,
  onMarkNeedsRevision,
  onMarkApproved,
  onToggleCommentsPanel,
  onToggleFocusMode,
  focusMode = false,
}: VideoHotkeysProps) {
  const remote = useMediaRemote()
  const currentTime = useMediaState("currentTime")
  const duration = useMediaState("duration")
  const { openComposer } = useVideoPlayer()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const currentTimeRef = useRef(currentTime)
  const durationRef = useRef(duration)

  useEffect(() => {
    currentTimeRef.current = currentTime
    durationRef.current = duration
  }, [currentTime, duration])

  const showReviewShortcuts =
    enableCommentShortcut || Boolean(onMarkNeedsRevision || onMarkApproved)

  useEffect(() => {
    if (!captureShortcuts) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isInteractiveTarget(event.target)) {
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

      const time = currentTimeRef.current
      const total = durationRef.current

      switch (event.key) {
        case " ":
          event.preventDefault()
          remote.togglePaused()
          return
        case "j":
        case "J":
          event.preventDefault()
          remote.seek(Math.max(0, time - SKIP_SECONDS))
          return
        case "l":
        case "L":
          event.preventDefault()
          remote.seek(
            total > 0 ? Math.min(total, time + SKIP_SECONDS) : time + SKIP_SECONDS,
          )
          return
        case "ArrowLeft":
          event.preventDefault()
          remote.seek(Math.max(0, time - FRAME_DURATION_SECONDS))
          return
        case "ArrowRight":
          event.preventDefault()
          remote.seek(
            total > 0
              ? Math.min(total, time + FRAME_DURATION_SECONDS)
              : time + FRAME_DURATION_SECONDS,
          )
          return
        case "c":
        case "C":
          if (!enableCommentShortcut) {
            return
          }
          event.preventDefault()
          openComposer(time)
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
        case "t":
        case "T":
          if (!onToggleCommentsPanel || focusMode) {
            return
          }
          event.preventDefault()
          onToggleCommentsPanel()
          return
        case "z":
        case "Z":
          if (!onToggleFocusMode) {
            return
          }
          event.preventDefault()
          onToggleFocusMode()
          return
        default:
          return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    captureShortcuts,
    enableCommentShortcut,
    focusMode,
    onMarkApproved,
    onMarkNeedsRevision,
    onToggleCommentsPanel,
    onToggleFocusMode,
    openComposer,
    remote,
    shortcutsOpen,
  ])

  if (!captureShortcuts) {
    return null
  }

  return (
    <KeyboardShortcutsPanel
      open={shortcutsOpen}
      onOpenChange={setShortcutsOpen}
      showReviewShortcuts={showReviewShortcuts}
    />
  )
}
