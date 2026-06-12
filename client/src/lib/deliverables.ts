import type { DeliverableStatus } from "@/types/deliverable"
import { DELIVERABLE_STATUSES } from "@/types/deliverable"

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
}

export const DELIVERABLE_STATUS_ORDER: DeliverableStatus[] = DELIVERABLE_STATUSES

export const DELIVERABLE_STATUS_STYLES: Record<DeliverableStatus, string> = {
  not_started: "status-pending",
  in_progress: "status-pending",
  in_review: "status-warning",
  approved: "status-success",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
}
