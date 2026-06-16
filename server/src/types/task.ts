export interface Task {
  id: string
  milestoneId: string
  name: string
  done: boolean
  order: number
  createdAt: string
}

export interface CreateTaskInput {
  milestoneId: string
  name: string
  done?: boolean
}

export interface UpdateTaskInput {
  name?: string
  done?: boolean
}
