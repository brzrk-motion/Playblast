import { isProjectArchived } from "../types/project"
import type { ProjectSummary } from "../types/project"

/** Active work: not archived and not marked completed. */
export function isActiveFinancialProject(project: ProjectSummary): boolean {
  return !isProjectArchived(project) && project.status !== "completed"
}

export function filterActiveFinancialProjects(
  projects: ProjectSummary[],
): ProjectSummary[] {
  return projects.filter(isActiveFinancialProject)
}

export function projectHasBudget(project: ProjectSummary): boolean {
  const total = project.budget?.total
  return total !== undefined && total > 0
}

export function isProjectOverBudget(project: ProjectSummary): boolean {
  if (!isActiveFinancialProject(project) || !projectHasBudget(project)) {
    return false
  }

  const estimate = project.servicesEstimate ?? 0
  return estimate > project.budget!.total
}

export function totalActiveEstimate(projects: ProjectSummary[]): number {
  return filterActiveFinancialProjects(projects).reduce(
    (sum, project) => sum + (project.servicesEstimate ?? 0),
    0,
  )
}

export function totalBudgetCommitted(projects: ProjectSummary[]): number {
  return filterActiveFinancialProjects(projects).reduce((sum, project) => {
    if (!projectHasBudget(project)) {
      return sum
    }
    return sum + project.budget!.total
  }, 0)
}

export function countProjectsOverBudget(projects: ProjectSummary[]): number {
  return filterActiveFinancialProjects(projects).filter(isProjectOverBudget).length
}
