import type { Client } from "./client.js"
import type { DeliverableStatus } from "./deliverable.js"

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived"

export const PROJECT_STATUSES: ProjectStatus[] = [
  "active",
  "on_hold",
  "completed",
  "archived",
]

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    (PROJECT_STATUSES as string[]).includes(value)
  )
}

/**
 * A single budget line item. Unused in the current UI but persisted so the
 * budget can grow into a line-item model without another schema migration.
 */
export interface BudgetLineItem {
  id: string
  label: string
  category?: string
  amount: number
}

export interface ProjectBudget {
  total: number
  currency: string
  /** Manually entered actual spend. */
  spent?: number
  lineItems?: BudgetLineItem[]
}

export interface Project {
  id: string
  name: string
  createdAt: string
  status: ProjectStatus
  /** Legacy free-text client label; prefer `clientId` when linked to a client record. */
  client?: string
  /** FK → clients.id when the project is linked to a managed client. */
  clientId?: string
  description?: string
  /** ISO date string. */
  startDate?: string
  /** ISO date string. */
  endDate?: string
  budget?: ProjectBudget
  /** Internal free-text notes; not shown on client-facing review views. */
  notes?: string
  /** Sum of unpaid/partially paid invoice balances for this project. */
  outstandingBalance?: number
}

/** Project detail with the linked client record populated (or null). */
export interface ProjectDetail extends Omit<Project, "client"> {
  client: Client | null
}

export interface ProjectSummary extends Project {
  deliverableCount: number
  versionCount: number
  openCommentCount: number
  updatedAt: string
  /** Count of deliverables in each status, for dashboard rollups. */
  deliverableStatusCounts: Record<DeliverableStatus, number>
  /** Soonest upcoming (incomplete) milestone, when present. */
  nextMilestone: { id: string; name: string; dueDate?: string } | null
  /** Linked client display name (company preferred), when clientId is set. */
  clientName?: string
  /** Total services estimate when at least one service is attached. */
  servicesEstimate?: number
  /** Sum of effective estimated hours from attached services. */
  servicesEstimatedHours?: number
}

export interface CreateProjectInput {
  name: string
  /** Optional stable id (e.g. upload folder slug). A UUID is generated when omitted. */
  id?: string
  status?: ProjectStatus
  client?: string
  clientId?: string
  description?: string
  startDate?: string
  endDate?: string
  budget?: ProjectBudget
  notes?: string
}

export interface UpdateProjectInput {
  name?: string
  status?: ProjectStatus
  client?: string | null
  clientId?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  budget?: ProjectBudget | null
  notes?: string | null
}
