export interface TimeLog {
  id: string
  taskId: string
  durationHours: number
  /** ISO timestamp when the work occurred. */
  loggedAt: string
  notes?: string
  createdAt: string
}

export interface CreateTimeLogInput {
  taskId: string
  durationHours: number
  loggedAt?: string
  notes?: string
}
