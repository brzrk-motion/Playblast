import { derivePipelineStatus } from "@/lib/pipeline"
import type { ProjectSummary } from "@/types/project"

export interface ProjectCapacityRow {
  project: ProjectSummary
  estimatedHours: number
  loggedHours: number | null
  remainingHours: number | null
  percentComplete: number | null
}

export interface CapacityTotals {
  activeProjectCount: number
  totalEstimatedHours: number
  totalLoggedHours: number | null
  totalRemainingHours: number | null
}

export function isActivePipelineProject(project: ProjectSummary): boolean {
  if (project.status === "completed") {
    return false
  }

  const pipelineStatus = derivePipelineStatus(project)
  return (
    pipelineStatus === "in_progress" || pipelineStatus === "pending_review"
  )
}

export function hasTimeTrackingData(projects: ProjectSummary[]): boolean {
  return projects.some((project) => project.servicesLoggedHours !== undefined)
}

export function projectEstimatedHours(project: ProjectSummary): number {
  return project.servicesEstimatedHours ?? 0
}

export function projectLoggedHours(project: ProjectSummary): number | null {
  if (project.servicesLoggedHours === undefined) {
    return null
  }

  return project.servicesLoggedHours
}

export function projectRemainingHours(
  estimatedHours: number,
  loggedHours: number | null,
): number | null {
  if (loggedHours === null) {
    return null
  }

  return Math.max(0, estimatedHours - loggedHours)
}

export function projectPercentComplete(
  estimatedHours: number,
  loggedHours: number | null,
): number | null {
  if (loggedHours === null) {
    return null
  }

  if (estimatedHours <= 0) {
    return loggedHours > 0 ? 100 : 0
  }

  return Math.min(100, Math.round((loggedHours / estimatedHours) * 100))
}

export function projectUtilizationPercent(
  estimatedHours: number,
  loggedHours: number | null,
): number {
  if (loggedHours === null || estimatedHours <= 0) {
    return 0
  }

  return Math.min(100, Math.round((loggedHours / estimatedHours) * 100))
}

export function isProjectOverEstimate(
  estimatedHours: number,
  loggedHours: number | null,
): boolean {
  return loggedHours !== null && estimatedHours > 0 && loggedHours > estimatedHours
}

export function buildProjectCapacityRow(
  project: ProjectSummary,
): ProjectCapacityRow {
  const estimatedHours = projectEstimatedHours(project)
  const loggedHours = projectLoggedHours(project)

  return {
    project,
    estimatedHours,
    loggedHours,
    remainingHours: projectRemainingHours(estimatedHours, loggedHours),
    percentComplete: projectPercentComplete(estimatedHours, loggedHours),
  }
}

export function filterActivePipelineProjects(
  projects: ProjectSummary[],
): ProjectSummary[] {
  return projects.filter(isActivePipelineProject)
}

export function buildCapacityRows(
  projects: ProjectSummary[],
): ProjectCapacityRow[] {
  return filterActivePipelineProjects(projects)
    .map(buildProjectCapacityRow)
    .sort((a, b) =>
      a.project.name.localeCompare(b.project.name, undefined, {
        sensitivity: "base",
      }),
    )
}

export function summarizeCapacity(
  projects: ProjectSummary[],
): CapacityTotals {
  const activeProjects = filterActivePipelineProjects(projects)
  const timeTrackingAvailable = hasTimeTrackingData(activeProjects)

  const totalEstimatedHours = activeProjects.reduce(
    (sum, project) => sum + projectEstimatedHours(project),
    0,
  )

  if (!timeTrackingAvailable) {
    return {
      activeProjectCount: activeProjects.length,
      totalEstimatedHours,
      totalLoggedHours: null,
      totalRemainingHours: null,
    }
  }

  const totalLoggedHours = activeProjects.reduce(
    (sum, project) => sum + (project.servicesLoggedHours ?? 0),
    0,
  )

  return {
    activeProjectCount: activeProjects.length,
    totalEstimatedHours,
    totalLoggedHours,
    totalRemainingHours: Math.max(0, totalEstimatedHours - totalLoggedHours),
  }
}

export function isCapacityOverload(
  remainingHours: number | null,
  weeklyCapacityHours: number | null,
): boolean {
  return (
    remainingHours !== null &&
    weeklyCapacityHours !== null &&
    weeklyCapacityHours > 0 &&
    remainingHours > weeklyCapacityHours
  )
}

export function capacityGaugePercent(
  remainingHours: number | null,
  weeklyCapacityHours: number | null,
): number {
  if (
    remainingHours === null ||
    weeklyCapacityHours === null ||
    weeklyCapacityHours <= 0
  ) {
    return 0
  }

  return Math.min(100, Math.round((remainingHours / weeklyCapacityHours) * 100))
}
