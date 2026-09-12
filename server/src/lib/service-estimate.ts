import {
  effectiveProjectServiceHours,
  projectServiceLineTotal,
  sumProjectServiceEstimatedHours,
  sumProjectServiceEstimate,
} from "@playblast/shared"
import type { ProjectServiceWithDetails } from "../types/project-service.js"

export {
  effectiveProjectServiceHours,
  projectServiceLineTotal,
}

export function calculateProjectServicesEstimate(
  items: ProjectServiceWithDetails[],
): number {
  return sumProjectServiceEstimate(items)
}

export function calculateProjectServicesEstimatedHours(
  items: ProjectServiceWithDetails[],
): number {
  return sumProjectServiceEstimatedHours(items)
}
