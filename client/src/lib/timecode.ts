/**
 * Formats seconds as H:MM:SS (hours omitted when zero).
 */
export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00:00"
  }

  const totalSeconds = Math.floor(seconds)
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const paddedMins = String(mins).padStart(2, "0")
  const paddedSecs = String(secs).padStart(2, "0")

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`
  }

  return `0:${paddedMins}:${paddedSecs}`
}

/**
 * Returns the frame index at the given time when FPS is known.
 */
export function timeToFrame(seconds: number, fps: number): number {
  if (!Number.isFinite(seconds) || fps <= 0) {
    return 0
  }

  return Math.round(seconds * fps)
}

/**
 * Duration of a single frame in seconds.
 */
export function frameDuration(fps: number): number {
  return fps > 0 ? 1 / fps : 1 / 24
}
