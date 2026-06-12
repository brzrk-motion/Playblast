export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const

export function formatPlaybackSpeed(rate: number): string {
  return rate === 1 ? "1x" : `${rate}x`
}
