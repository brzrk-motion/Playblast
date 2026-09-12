import {
  addDaysToIsoDate,
  formatLocalIsoDate,
  getWeekStartFromDate,
  isIsoDate,
  isoDateToLoggedAt,
} from "@playblast/shared"

export {
  addDaysToIsoDate,
  formatLocalIsoDate,
  getWeekStartFromDate,
  isIsoDate,
  isoDateToLoggedAt,
}

export function getWeekEnd(weekStart: string): string {
  return addDaysToIsoDate(weekStart, 6)
}
