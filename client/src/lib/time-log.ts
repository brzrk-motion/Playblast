const TIMER_STORAGE_PREFIX = "playblast:task-timer:"

export interface TaskTimerState {
  startedAt: string
}

export function getTaskTimerStorageKey(taskId: string): string {
  return `${TIMER_STORAGE_PREFIX}${taskId}`
}

export function readTaskTimer(taskId: string): TaskTimerState | null {
  try {
    const raw = localStorage.getItem(getTaskTimerStorageKey(taskId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as TaskTimerState
    if (typeof parsed.startedAt !== "string" || !parsed.startedAt) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function writeTaskTimer(taskId: string, state: TaskTimerState): void {
  localStorage.setItem(getTaskTimerStorageKey(taskId), JSON.stringify(state))
}

export function clearTaskTimer(taskId: string): void {
  localStorage.removeItem(getTaskTimerStorageKey(taskId))
}

export function elapsedHoursSince(startedAt: string, now = Date.now()): number {
  const startedMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedMs)) return 0
  return Math.max(0, (now - startedMs) / (1000 * 60 * 60))
}

export function formatElapsedClock(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function formatDurationHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0h"

  const rounded = Math.round(hours * 100) / 100
  if (rounded < 1) {
    const minutes = Math.round(rounded * 60)
    return `${minutes}m`
  }

  const wholeHours = Math.floor(rounded)
  const minutes = Math.round((rounded - wholeHours) * 60)
  if (minutes === 0) {
    return `${wholeHours}h`
  }

  return `${wholeHours}h ${minutes}m`
}
