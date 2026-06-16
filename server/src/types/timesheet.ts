export interface TimesheetTaskRow {
  taskId: string
  taskName: string
  /** Hours per day Mon–Sun (7 elements). */
  days: number[]
  weekTotal: number
}

export interface TimesheetProjectGroup {
  projectId: string
  projectName: string
  tasks: TimesheetTaskRow[]
  weekTotal: number
}

export interface TimesheetWeek {
  weekStart: string
  weekEnd: string
  projects: TimesheetProjectGroup[]
  /** Total hours per day Mon–Sun (7 elements). */
  dayTotals: number[]
  grandTotal: number
}
