import type { ProjectServiceWithDetails } from "../types/project-service.js"

export function effectiveProjectServiceHours(
  item: ProjectServiceWithDetails,
): number {
  return item.overrideHours ?? item.service.hourEstimate
}

export function projectServiceLineTotal(item: ProjectServiceWithDetails): number {
  return effectiveProjectServiceHours(item) * item.service.hourlyRate
}

export function calculateProjectServicesEstimate(
  items: ProjectServiceWithDetails[],
): number {
  return items.reduce((sum, item) => sum + projectServiceLineTotal(item), 0)
}

export function calculateProjectServicesEstimatedHours(
  items: ProjectServiceWithDetails[],
): number {
  return items.reduce((sum, item) => sum + effectiveProjectServiceHours(item), 0)
}
