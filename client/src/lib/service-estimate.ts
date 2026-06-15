import type { ProjectServiceWithDetails } from "@/types/project-service"
import type { ServiceType } from "@/types/service"
import { SERVICE_TYPES } from "@/types/service"

export interface ServiceLineEstimate {
  item: ProjectServiceWithDetails
  hours: number
  lineTotal: number
}

export interface TypeSubtotal {
  type: ServiceType
  hours: number
  lineTotal: number
}

export interface ProjectCostEstimate {
  lines: ServiceLineEstimate[]
  typeSubtotals: TypeSubtotal[]
  totalHours: number
  totalEstimate: number
}

export function effectiveProjectServiceHours(
  item: ProjectServiceWithDetails,
): number {
  return item.overrideHours ?? item.service.hourEstimate
}

export function isProjectServiceHoursOverridden(
  item: ProjectServiceWithDetails,
): boolean {
  return item.overrideHours !== null
}

export function projectServiceLineTotal(item: ProjectServiceWithDetails): number {
  return effectiveProjectServiceHours(item) * item.service.hourlyRate
}

export function calculateProjectCostEstimate(
  items: ProjectServiceWithDetails[],
): ProjectCostEstimate {
  const lines = items.map((item) => ({
    item,
    hours: effectiveProjectServiceHours(item),
    lineTotal: projectServiceLineTotal(item),
  }))

  const typeSubtotals = SERVICE_TYPES.map((type) => {
    const typeLines = lines.filter((line) => line.item.service.type === type)
    return {
      type,
      hours: typeLines.reduce((sum, line) => sum + line.hours, 0),
      lineTotal: typeLines.reduce((sum, line) => sum + line.lineTotal, 0),
    }
  }).filter((subtotal) => subtotal.hours > 0)

  return {
    lines,
    typeSubtotals,
    totalHours: lines.reduce((sum, line) => sum + line.hours, 0),
    totalEstimate: lines.reduce((sum, line) => sum + line.lineTotal, 0),
  }
}
