export type VersionStatus = "pending_review" | "needs_revision" | "approved"

export interface Version {
  id: string
  projectId: string
  label: string
  filename: string
  uploadedAt: string
  status: VersionStatus
}
