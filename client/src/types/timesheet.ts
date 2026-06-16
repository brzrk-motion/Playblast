export interface TimesheetTaskRow {
  taskId: string
  taskName: string
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
  dayTotals: number[]
  grandTotal: number
}
