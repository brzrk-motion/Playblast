import { effectiveProjectServiceHours } from "./service-estimate.js"
import type { ProjectServiceWithDetails } from "../types/project-service.js"
import type {
  ProjectHoursSummary,
  ProjectHoursSummaryLine,
} from "../types/hours-summary.js"

export function buildProjectHoursSummary(
  projectServices: ProjectServiceWithDetails[],
  totalLoggedHours: number,
): ProjectHoursSummary {
  const lines: ProjectHoursSummaryLine[] = projectServices.map((item) => ({
    serviceId: item.serviceId,
    serviceName: item.service.name,
    estimatedHours: effectiveProjectServiceHours(item),
  }))

  const totalEstimatedHours = lines.reduce(
    (sum, line) => sum + line.estimatedHours,
    0,
  )

  return {
    lines,
    totalEstimatedHours,
    totalLoggedHours,
    deltaHours: totalLoggedHours - totalEstimatedHours,
  }
}
