export interface Milestone {
  id: string
  projectId: string
  name: string
  dueDate?: string
  done: boolean
  order: number
  createdAt: string
}
