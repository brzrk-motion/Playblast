import { isEstimateOverBudget } from "@/lib/budget"
import { isProjectArchived } from "@/lib/projects"
import type { ProjectSummary } from "@/types/project"

export interface FinancialSummary {
  activeEstimate: number
  budgetCommitted: number
  overBudgetCount: number
  currency: string
}

export function isFinancialActiveProject(project: ProjectSummary): boolean {
  return !isProjectArchived(project) && project.status !== "completed"
}

export function filterFinancialActiveProjects(
  projects: ProjectSummary[],
): ProjectSummary[] {
  return projects.filter(isFinancialActiveProject)
}

export function projectHasExplicitBudget(project: ProjectSummary): boolean {
  const total = project.budget?.total
  return total !== undefined && total > 0
}

export function projectServicesEstimate(project: ProjectSummary): number {
  return project.servicesEstimate ?? 0
}

export function isProjectOverBudget(project: ProjectSummary): boolean {
  if (!isFinancialActiveProject(project) || !projectHasExplicitBudget(project)) {
    return false
  }

  const estimate = projectServicesEstimate(project)
  return isEstimateOverBudget(project.budget!.total, estimate)
}

export function summarizeFinancials(
  projects: ProjectSummary[],
  defaultCurrency = "USD",
): FinancialSummary {
  const activeProjects = filterFinancialActiveProjects(projects)

  let activeEstimate = 0
  let budgetCommitted = 0
  let overBudgetCount = 0
  let currency = defaultCurrency

  for (const project of activeProjects) {
    activeEstimate += projectServicesEstimate(project)

    if (projectHasExplicitBudget(project)) {
      budgetCommitted += project.budget!.total
      if (project.budget?.currency) {
        currency = project.budget.currency
      }
    }

    if (isProjectOverBudget(project)) {
      overBudgetCount += 1
    }
  }

  return {
    activeEstimate,
    budgetCommitted,
    overBudgetCount,
    currency,
  }
}
