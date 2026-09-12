import {
  addDaysToIsoDate,
  formatLocalIsoDate,
  getWeekStartFromDate,
  isIsoDate,
  isoDateToLoggedAt,
} from "@playblast/shared"

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export {
  formatLocalIsoDate,
  getWeekStartFromDate,
  isIsoDate,
  isoDateToLoggedAt,
}

export function addWeeks(weekStart: string, weeks: number): string {
  return addDaysToIsoDate(weekStart, weeks * 7)
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToIsoDate(weekStart, index))
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T12:00:00`)
  const end = new Date(`${weekEnd}T12:00:00`)
  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return `${startLabel} – ${endLabel}`
}

export function loggedAtToIsoDate(loggedAt: string): string {
  return loggedAt.slice(0, 10)
}

export function formatTimesheetHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return ""
  const rounded = Math.round(hours * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}
