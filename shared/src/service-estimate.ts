export interface ServiceEstimateLine {
  overrideHours: number | null
  service: {
    hourEstimate: number
    hourlyRate: number
  }
}

export function effectiveProjectServiceHours(item: ServiceEstimateLine): number {
  return item.overrideHours ?? item.service.hourEstimate
}

export function projectServiceLineTotal(item: ServiceEstimateLine): number {
  return effectiveProjectServiceHours(item) * item.service.hourlyRate
}

export function sumProjectServiceEstimate(items: ServiceEstimateLine[]): number {
  return items.reduce((sum, item) => sum + projectServiceLineTotal(item), 0)
}

export function sumProjectServiceEstimatedHours(items: ServiceEstimateLine[]): number {
  return items.reduce((sum, item) => sum + effectiveProjectServiceHours(item), 0)
}
