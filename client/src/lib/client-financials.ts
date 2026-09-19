import {
  estimateBudgetStatus,
  estimateBudgetVariance,
  type EstimateBudgetStatus,
} from "@/lib/budget"
import type { ClientLinkedProject } from "@/types/client"

export interface ClientFinancialSummary {
  totalEstimate: number
  totalBudget: number
  variance: number
  hasFinancialData: boolean
  hasEstimateData: boolean
  hasBudgetData: boolean
  aggregateBudgetStatus: EstimateBudgetStatus | null
  currency: string
}

function worstBudgetStatus(
  statuses: EstimateBudgetStatus[],
): EstimateBudgetStatus | null {
  if (statuses.length === 0) {
    return null
  }
  if (statuses.includes("over")) {
    return "over"
  }
  if (statuses.includes("warning")) {
    return "warning"
  }
  return "healthy"
}

export function summarizeClientFinancials(
  projects: ClientLinkedProject[],
): ClientFinancialSummary {
  let totalEstimate = 0
  let totalBudget = 0
  let hasEstimateData = false
  let hasBudgetData = false
  let currency = "USD"
  const projectStatuses: EstimateBudgetStatus[] = []

  for (const project of projects) {
    const estimate = project.servicesEstimate
    if (estimate !== undefined && estimate > 0) {
      hasEstimateData = true
      totalEstimate += estimate
      if (project.budget?.currency) {
        currency = project.budget.currency
      }
    }

    const budgetTotal = project.budget?.total
    if (budgetTotal !== undefined && budgetTotal > 0) {
      hasBudgetData = true
      totalBudget += budgetTotal
      if (project.budget?.currency) {
        currency = project.budget.currency
      }

      if (estimate !== undefined && estimate > 0) {
        projectStatuses.push(estimateBudgetStatus(budgetTotal, estimate))
      }
    }
  }

  return {
    totalEstimate,
    totalBudget,
    variance: estimateBudgetVariance(totalBudget, totalEstimate),
    hasFinancialData: hasEstimateData || hasBudgetData,
    hasEstimateData,
    hasBudgetData,
    aggregateBudgetStatus: worstBudgetStatus(projectStatuses),
    currency,
  }
}
