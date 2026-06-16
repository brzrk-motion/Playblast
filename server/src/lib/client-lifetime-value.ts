import type { ProjectStatus } from "../types/project.js"

/** Estimated lifetime value across a client's linked projects. */
export interface ClientLifetimeValue {
  /** Sum of service estimates across all linked projects. */
  totalEstimated: number
  /** Projects still in flight (active or on hold). */
  activeEstimated: number
  /** Projects marked completed. */
  completedEstimated: number
}

const ACTIVE_PROJECT_STATUSES = new Set<ProjectStatus>(["active", "on_hold"])
const COMPLETED_PROJECT_STATUSES = new Set<ProjectStatus>(["completed"])

export function isActiveLifetimeProjectStatus(status: ProjectStatus): boolean {
  return ACTIVE_PROJECT_STATUSES.has(status)
}

export function isCompletedLifetimeProjectStatus(status: ProjectStatus): boolean {
  return COMPLETED_PROJECT_STATUSES.has(status)
}

export function emptyClientLifetimeValue(): ClientLifetimeValue {
  return {
    totalEstimated: 0,
    activeEstimated: 0,
    completedEstimated: 0,
  }
}

export function accumulateClientLifetimeValue(
  current: ClientLifetimeValue,
  status: ProjectStatus,
  estimate: number,
): ClientLifetimeValue {
  const next: ClientLifetimeValue = {
    totalEstimated: current.totalEstimated + estimate,
    activeEstimated: current.activeEstimated,
    completedEstimated: current.completedEstimated,
  }

  if (isActiveLifetimeProjectStatus(status)) {
    next.activeEstimated += estimate
  } else if (isCompletedLifetimeProjectStatus(status)) {
    next.completedEstimated += estimate
  }

  return next
}
