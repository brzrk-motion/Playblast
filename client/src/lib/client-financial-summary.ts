import {
  estimateBudgetStatus,
  estimateBudgetVariance,
  type EstimateBudgetStatus,
} from "@/lib/budget"
import type { ClientLinkedProject } from "@/types/client"

export interface ClientFinancialSummary {
  totalEstimate: number
  totalBudget: number
  variance: number | null
  health: EstimateBudgetStatus | null
  hasEstimates: boolean
  hasBudgets: boolean
  hasFinancialData: boolean
  currency: string
}

const HEALTH_PRIORITY: Record<EstimateBudgetStatus, number> = {
  healthy: 0,
  warning: 1,
  over: 2,
}

function projectHasEstimate(project: ClientLinkedProject): boolean {
  return project.servicesEstimate !== undefined && project.servicesEstimate > 0
}

function projectHasBudget(project: ClientLinkedProject): boolean {
  const total = project.budget?.total
  return total !== undefined && total > 0
}

function resolveCurrency(projects: ClientLinkedProject[]): string {
  for (const project of projects) {
    if (project.budget?.currency) {
      return project.budget.currency
    }
  }

  return "USD"
}

function aggregateHealth(
  projects: ClientLinkedProject[],
): EstimateBudgetStatus | null {
  let worst: EstimateBudgetStatus | null = null

  for (const project of projects) {
    if (!projectHasEstimate(project) || !projectHasBudget(project)) {
      continue
    }

    const status = estimateBudgetStatus(
      project.budget!.total,
      project.servicesEstimate!,
    )

    if (
      worst === null ||
      HEALTH_PRIORITY[status] > HEALTH_PRIORITY[worst]
    ) {
      worst = status
    }
  }

  return worst
}

export function calculateClientFinancialSummary(
  projects: ClientLinkedProject[],
): ClientFinancialSummary {
  const currency = resolveCurrency(projects)

  let totalEstimate = 0
  let totalBudget = 0
  let hasEstimates = false
  let hasBudgets = false

  for (const project of projects) {
    if (projectHasEstimate(project)) {
      hasEstimates = true
      totalEstimate += project.servicesEstimate!
    }

    if (projectHasBudget(project)) {
      hasBudgets = true
      totalBudget += project.budget!.total
    }
  }

  const variance =
    hasEstimates && hasBudgets
      ? estimateBudgetVariance(totalBudget, totalEstimate)
      : null

  const health = aggregateHealth(projects)

  return {
    totalEstimate,
    totalBudget,
    variance,
    health,
    hasEstimates,
    hasBudgets,
    hasFinancialData: hasEstimates || hasBudgets,
    currency,
  }
}
