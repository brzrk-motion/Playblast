import type { Client } from "./client"
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
  /** Legacy free-text client label; prefer `clientId` when linked to a managed client. */
  client?: string
  /** FK → clients.id when the project is linked to a managed client. */
  clientId?: string
  description?: string
  startDate?: string
  endDate?: string
  budget?: ProjectBudget
}

/** Project detail with the linked client record populated (or null). */
export interface ProjectDetail extends Omit<Project, "client"> {
  client: Client | null
  outstandingBalance?: number
}

export interface ProjectSummary extends Project {
  deliverableCount: number
  versionCount: number
  openCommentCount: number
  updatedAt: string
  deliverableStatusCounts: Record<DeliverableStatus, number>
  nextMilestone: { id: string; name: string; dueDate?: string } | null
  /** Linked client display name (company preferred), when clientId is set. */
  clientName?: string
  /** Total services estimate when at least one service is attached. */
  servicesEstimate?: number
  /** Sum of effective estimated hours from attached services. */
  servicesEstimatedHours?: number
}
