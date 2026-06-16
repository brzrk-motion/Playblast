export type MarginStatus = "healthy" | "warning" | "critical"

export interface ProjectProfitabilityInput {
  estimatedHours: number
  estimatedValue: number
  actualHours?: number
  internalHourlyCostRate?: number | null
}

export interface ProjectProfitability {
  estimatedHours: number
  actualHours: number
  estimatedValue: number
  /** Cost basis used for margin (actual or estimated hours × internal rate). */
  costBasis: number | null
  marginPercent: number | null
  /** True when margin uses estimated hours because time tracking is unavailable. */
  isEstimatedMargin: boolean
  /** Billable rate implied by the services estimate. */
  billedHourlyRate: number | null
  /** Revenue per actual hour when actual hours differ from estimated. */
  effectiveHourlyRate: number | null
}

/** Green > 60%, amber 40–60%, red < 40%. */
export function marginStatus(marginPercent: number): MarginStatus {
  if (marginPercent > 60) {
    return "healthy"
  }
  if (marginPercent >= 40) {
    return "warning"
  }
  return "critical"
}

export const MARGIN_STATUS_LABELS: Record<MarginStatus, string> = {
  healthy: "Strong margin",
  warning: "Moderate margin",
  critical: "Low margin",
}

export const MARGIN_STATUS_STYLES: Record<MarginStatus, string> = {
  healthy: "status-success",
  warning: "status-warning",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
}

export const MARGIN_STATUS_DOT_STYLES: Record<MarginStatus, string> = {
  healthy: "bg-status-success",
  warning: "bg-status-warning",
  critical: "bg-destructive",
}

export function formatMarginPercent(marginPercent: number): string {
  const rounded = Math.round(marginPercent * 10) / 10
  return `${rounded}%`
}

/**
 * Margin % = (estimated value - cost) / estimated value.
 * Cost = hours × internal hourly cost rate. When no time logs exist yet,
 * estimated hours are used for cost and the margin is marked as estimated.
 */
export function calculateProjectProfitability(
  input: ProjectProfitabilityInput,
): ProjectProfitability {
  const estimatedHours = input.estimatedHours
  const estimatedValue = input.estimatedValue
  const actualHours = input.actualHours ?? 0
  const internalRate = input.internalHourlyCostRate

  const billedHourlyRate =
    estimatedHours > 0 ? estimatedValue / estimatedHours : null

  if (internalRate === undefined || internalRate === null || internalRate <= 0) {
    return {
      estimatedHours,
      actualHours,
      estimatedValue,
      costBasis: null,
      marginPercent: null,
      isEstimatedMargin: actualHours === 0,
      billedHourlyRate,
      effectiveHourlyRate: null,
    }
  }

  const hasActualHours = actualHours > 0
  const costHours = hasActualHours ? actualHours : estimatedHours
  const costBasis = costHours * internalRate
  const marginPercent =
    estimatedValue > 0
      ? ((estimatedValue - costBasis) / estimatedValue) * 100
      : null

  const effectiveHourlyRate =
    hasActualHours &&
    estimatedHours > 0 &&
    Math.abs(actualHours - estimatedHours) > 0.001
      ? estimatedValue / actualHours
      : null

  return {
    estimatedHours,
    actualHours,
    estimatedValue,
    costBasis,
    marginPercent,
    isEstimatedMargin: !hasActualHours,
    billedHourlyRate,
    effectiveHourlyRate,
  }
}
