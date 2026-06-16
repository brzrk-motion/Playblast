const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime())
}

export function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getWeekStartFromDate(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return formatLocalIsoDate(d)
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

export function isoDateToLoggedAt(isoDate: string): string {
  return `${isoDate}T12:00:00.000Z`
}

export function loggedAtToIsoDate(loggedAt: string): string {
  return loggedAt.slice(0, 10)
}

export function formatTimesheetHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return ""
  const rounded = Math.round(hours * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return formatLocalIsoDate(date)
}
