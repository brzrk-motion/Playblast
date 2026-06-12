import type { VersionStatus } from "./version"

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

export interface Deliverable {
  id: string
  projectId: string
  name: string
  description?: string
  status: DeliverableStatus
  dueDate?: string
  createdAt: string
  order: number
}

export interface DeliverableSummary extends Deliverable {
  versionCount: number
  openCommentCount: number
  updatedAt: string
  latestVersionStatus: VersionStatus | null
}
