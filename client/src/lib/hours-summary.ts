import type { ProjectHoursSummary } from "@/types/hours-summary"

export type HoursDeltaStatus = "healthy" | "warning" | "over"

/** Amber when within 10% of estimate; red when logged exceeds estimate. */
export function hoursDeltaStatus(
  estimatedHours: number,
  loggedHours: number,
): HoursDeltaStatus {
  if (estimatedHours <= 0) {
    return loggedHours > 0 ? "over" : "healthy"
  }

  if (loggedHours > estimatedHours) {
    return "over"
  }

  if (loggedHours >= estimatedHours * 0.9) {
    return "warning"
  }

  return "healthy"
}

export const HOURS_DELTA_STATUS_STYLES: Record<HoursDeltaStatus, string> = {
  healthy: "text-foreground",
  warning: "text-status-warning-foreground",
  over: "text-destructive",
}

export function formatSignedHoursDelta(deltaHours: number): string {
  const abs = Math.abs(deltaHours)
  const formatted =
    Number.isInteger(abs) || abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)

  if (deltaHours > 0) return `+${formatted}h`
  if (deltaHours < 0) return `-${formatted}h`
  return "0h"
}

export function hasLoggedTime(summary: ProjectHoursSummary): boolean {
  return summary.totalLoggedHours > 0
}
