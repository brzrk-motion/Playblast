export type VersionStatus = "pending_review" | "needs_revision" | "approved"

export const VERSION_STATUSES: VersionStatus[] = [
  "pending_review",
  "needs_revision",
  "approved",
]

export function isVersionStatus(value: unknown): value is VersionStatus {
  return (
    typeof value === "string" &&
    (VERSION_STATUSES as string[]).includes(value)
  )
}

export interface Version {
  id: string
  projectId: string
  /** Human-readable label such as v1, v2 */
  label: string
  filename: string
  uploadedAt: string
  status: VersionStatus
}

export interface CreateVersionInput {
  projectId: string
  label: string
  filename: string
}
