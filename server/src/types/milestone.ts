export interface Milestone {
  id: string
  projectId: string
  name: string
  /** ISO date string for the milestone due date. */
  dueDate?: string
  done: boolean
  order: number
  createdAt: string
}

export interface CreateMilestoneInput {
  projectId: string
  name: string
  dueDate?: string
  done?: boolean
}

export interface UpdateMilestoneInput {
  name?: string
  dueDate?: string | null
  done?: boolean
}
