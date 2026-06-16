export interface ProjectHoursSummaryLine {
  serviceId: string
  serviceName: string
  estimatedHours: number
}

export interface ProjectHoursSummary {
  lines: ProjectHoursSummaryLine[]
  totalEstimatedHours: number
  totalLoggedHours: number
  /** Logged minus estimated; positive means over estimate. */
  deltaHours: number
}
