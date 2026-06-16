/** Billing cycle helpers for retainer clients (cycle day 1–28). */

function padTwo(value: number): string {
  return String(value).padStart(2, "0")
}

function formatDateLocal(year: number, month: number, day: number): string {
  return `${year}-${padTwo(month)}-${padTwo(day)}`
}

function parseDateLocal(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number)
  return { year, month, day }
}

export function clampRetainerCycleDay(cycleDay: number): number {
  return Math.min(Math.max(Math.trunc(cycleDay), 1), 28)
}

export function getCurrentCycleStart(
  cycleDay: number,
  referenceDate = new Date(),
): string {
  const day = clampRetainerCycleDay(cycleDay)
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() + 1
  const date = referenceDate.getDate()

  if (date >= day) {
    return formatDateLocal(year, month, day)
  }

  if (month === 1) {
    return formatDateLocal(year - 1, 12, day)
  }

  return formatDateLocal(year, month - 1, day)
}

export function getNextCycleStart(cycleStart: string): string {
  const { year, month, day } = parseDateLocal(cycleStart)

  if (month === 12) {
    return formatDateLocal(year + 1, 1, day)
  }

  return formatDateLocal(year, month + 1, day)
}

export function getCycleEnd(cycleStart: string): string {
  const nextStart = getNextCycleStart(cycleStart)
  const { year, month, day } = parseDateLocal(nextStart)

  if (month === 1) {
    const prevDay = day - 1
    if (prevDay >= 1) {
      return formatDateLocal(year - 1, 12, prevDay)
    }
    return formatDateLocal(year - 1, 11, 30)
  }

  const prevMonth = month - 1
  const prevDay = day - 1

  if (prevDay >= 1) {
    return formatDateLocal(year, prevMonth, prevDay)
  }

  const daysInPrevMonth = new Date(year, prevMonth, 0).getDate()
  return formatDateLocal(year, prevMonth, daysInPrevMonth)
}

export interface RetainerSummary {
  cycleStart: string
  cycleEnd: string
  hoursContracted: number
  hoursLogged: number
  hoursRemaining: number
  estimatedValue: number
  utilizationPercent: number
  isOverage: boolean
}

export function computeRetainerSummary(input: {
  retainerHours: number
  retainerRate: number
  retainerCycleDay: number
  hoursLogged: number
  referenceDate?: Date
}): RetainerSummary {
  const hoursContracted = input.retainerHours
  const hoursLogged = input.hoursLogged
  const cycleStart = getCurrentCycleStart(
    input.retainerCycleDay,
    input.referenceDate,
  )
  const cycleEnd = getCycleEnd(cycleStart)
  const hoursRemaining = Math.max(0, hoursContracted - hoursLogged)
  const estimatedValue = hoursContracted * input.retainerRate
  const utilizationPercent =
    hoursContracted > 0
      ? Math.round((hoursLogged / hoursContracted) * 100)
      : 0
  const isOverage = hoursLogged > hoursContracted

  return {
    cycleStart,
    cycleEnd,
    hoursContracted,
    hoursLogged,
    hoursRemaining,
    estimatedValue,
    utilizationPercent,
    isOverage,
  }
}
