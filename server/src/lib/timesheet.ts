import { addDaysToIsoDate } from "./invoice.js"

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime())
}

/** Monday of the week containing `date`, as YYYY-MM-DD (local calendar). */
export function getWeekStartFromDate(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return formatLocalIsoDate(d)
}

export function getWeekEnd(weekStart: string): string {
  return addDaysToIsoDate(weekStart, 6)
}

export function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function isoDateToLoggedAt(isoDate: string): string {
  return `${isoDate}T12:00:00.000Z`
}
