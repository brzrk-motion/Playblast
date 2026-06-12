import type { VersionStatus } from "./version.js"

export type DeliverableStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "approved"
  | "rejected"

export const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  "not_started",
  "in_progress",
  "in_review",
  "approved",
  "rejected",
]

export function isDeliverableStatus(value: unknown): value is DeliverableStatus {
  return (
    typeof value === "string" &&
    (DELIVERABLE_STATUSES as string[]).includes(value)
  )
}

export interface Deliverable {
  id: string
  projectId: string
  name: string
  description?: string
  status: DeliverableStatus
  /** ISO date string for the deliverable due date. */
  dueDate?: string
  createdAt: string
  /** Manual ordering within the project. */
  order: number
}

export interface DeliverableSummary extends Deliverable {
  versionCount: number
  openCommentCount: number
  updatedAt: string
  /** Status of the most recently uploaded version, when present. */
  latestVersionStatus: VersionStatus | null
}

export interface CreateDeliverableInput {
  projectId: string
  name: string
  description?: string
  status?: DeliverableStatus
  dueDate?: string
}

export interface UpdateDeliverableInput {
  name?: string
  description?: string
  status?: DeliverableStatus
  dueDate?: string | null
}
