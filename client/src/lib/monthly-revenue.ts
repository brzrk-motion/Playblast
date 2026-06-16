import { projectEstimatedValue } from "@/lib/pipeline"
import type { ProjectSummary } from "@/types/project"

export type RevenueDateField = "startDate" | "endDate"

export interface MonthlyRevenueBucket {
  monthKey: string
  monthLabel: string
  fullLabel: string
  projectCount: number
  totalValue: number
  isCurrentMonth: boolean
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

const FULL_MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

function parseProjectMonth(dateValue: string): { year: number; monthIndex: number } | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateValue.trim())
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) {
    return null
  }

  return { year, monthIndex }
}

export function buildMonthlyRevenueBuckets(
  projects: ProjectSummary[],
  dateField: RevenueDateField,
  referenceDate: Date = new Date(),
): MonthlyRevenueBucket[] {
  const year = referenceDate.getFullYear()
  const currentMonthIndex = referenceDate.getMonth()

  const buckets = new Map<string, MonthlyRevenueBucket>()
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const key = monthKey(year, monthIndex)
    buckets.set(key, {
      monthKey: key,
      monthLabel: MONTH_LABELS[monthIndex],
      fullLabel: `${FULL_MONTH_LABELS[monthIndex]} ${year}`,
      projectCount: 0,
      totalValue: 0,
      isCurrentMonth: monthIndex === currentMonthIndex,
    })
  }

  for (const project of projects) {
    const dateValue = project[dateField]
    if (!dateValue) {
      continue
    }

    const parsed = parseProjectMonth(dateValue)
    if (!parsed || parsed.year !== year) {
      continue
    }

    const bucket = buckets.get(monthKey(parsed.year, parsed.monthIndex))
    if (!bucket) {
      continue
    }

    bucket.projectCount += 1
    bucket.totalValue += projectEstimatedValue(project)
  }

  return Array.from(buckets.values())
}
