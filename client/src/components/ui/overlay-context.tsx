import * as React from "react"

export interface OverlayContextValue {
  onOpenChange?: (open: boolean) => void
  restoreFocusRef: React.RefObject<HTMLElement | null>
}

export const OverlayContext = React.createContext<OverlayContextValue>({
  restoreFocusRef: { current: null },
})

export function useOverlayContext() {
  return React.useContext(OverlayContext)
}
