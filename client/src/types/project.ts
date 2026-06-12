import type { DeliverableStatus } from "./deliverable"

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived"

export const PROJECT_STATUSES: ProjectStatus[] = [
  "active",
  "on_hold",
  "completed",
  "archived",
]

export interface BudgetLineItem {
  id: string
  label: string
  category?: string
  amount: number
}

export interface ProjectBudget {
  total: number
  currency: string
  spent?: number
  lineItems?: BudgetLineItem[]
}

export interface Project {
  id: string
  name: string
  createdAt: string
  status: ProjectStatus
  client?: string
  description?: string
  startDate?: string
  endDate?: string
  budget?: ProjectBudget
}

export interface ProjectSummary extends Project {
  deliverableCount: number
  versionCount: number
  openCommentCount: number
  updatedAt: string
  deliverableStatusCounts: Record<DeliverableStatus, number>
  nextMilestone: { id: string; name: string; dueDate?: string } | null
}
