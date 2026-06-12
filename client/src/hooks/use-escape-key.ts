import { useEffect } from "react"

/**
 * Calls `onEscape` when the user presses Escape. Uses a document-level listener
 * so dismissal works even when focus is inside a nested control.
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return
      }

      onEscape()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onEscape, enabled])
}
