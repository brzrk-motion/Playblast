import type { ProjectBudget } from "@/types/project"

export type BudgetHealth = "healthy" | "warning" | "over"

export type EstimateBudgetStatus = BudgetHealth

export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`
  }
}

export function formatEstimateCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function budgetSpentRatio(budget: ProjectBudget): number {
  if (!budget.total || budget.total <= 0) {
    return 0
  }
  return (budget.spent ?? 0) / budget.total
}

export function budgetHealth(budget: ProjectBudget): BudgetHealth {
  const ratio = budgetSpentRatio(budget)
  if (ratio > 1) {
    return "over"
  }
  if (ratio >= 0.85) {
    return "warning"
  }
  return "healthy"
}

export const BUDGET_HEALTH_LABELS: Record<BudgetHealth, string> = {
  healthy: "On budget",
  warning: "Near budget",
  over: "Over budget",
}

export const BUDGET_HEALTH_STYLES: Record<BudgetHealth, string> = {
  healthy: "status-success",
  warning: "status-warning",
  over: "border-destructive/40 bg-destructive/10 text-destructive",
}

/** Budget minus services estimate. Positive = under budget. */
export function estimateBudgetVariance(budgetTotal: number, estimate: number): number {
  return budgetTotal - estimate
}

/** Variance as a percentage of budget. Positive = under budget. */
export function estimateBudgetVariancePercent(
  budgetTotal: number,
  estimate: number,
): number {
  if (!budgetTotal || budgetTotal <= 0) {
    return 0
  }
  return (estimateBudgetVariance(budgetTotal, estimate) / budgetTotal) * 100
}

/**
 * Green: under budget (or no budget). Amber: within 10% of budget. Red: over budget.
 */
export function estimateBudgetStatus(
  budgetTotal: number | undefined | null,
  estimate: number,
): EstimateBudgetStatus {
  if (!budgetTotal || budgetTotal <= 0) {
    return "healthy"
  }
  if (estimate > budgetTotal) {
    return "over"
  }
  if (estimate >= budgetTotal * 0.9) {
    return "warning"
  }
  return "healthy"
}

export const ESTIMATE_BUDGET_STATUS_LABELS: Record<EstimateBudgetStatus, string> = {
  healthy: "Under budget",
  warning: "Near budget",
  over: "Over budget",
}

export const ESTIMATE_BUDGET_STATUS_STYLES: Record<EstimateBudgetStatus, string> =
  BUDGET_HEALTH_STYLES
