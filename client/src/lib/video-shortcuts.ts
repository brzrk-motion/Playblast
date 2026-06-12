export const SKIP_SECONDS = 5
export const FRAME_DURATION_SECONDS = 1 / 24

export interface KeyboardShortcut {
  keys: string[]
  description: string
}

export const PLAYBACK_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ["Space"], description: "Play / pause" },
  { keys: ["J"], description: "Skip back 5 seconds" },
  { keys: ["L"], description: "Skip forward 5 seconds" },
  { keys: ["←", "→"], description: "Step one frame (1/24 s)" },
]

export const REVIEW_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ["C"], description: "Add comment at current time" },
  { keys: ["T"], description: "Toggle comments panel" },
  { keys: ["Z"], description: "Toggle focus mode" },
  { keys: ["R"], description: "Mark version as needs revision" },
  { keys: ["A"], description: "Mark version as approved" },
]

export const HELP_SHORTCUT: KeyboardShortcut = {
  keys: ["?"],
  description: "Show keyboard shortcuts",
}
