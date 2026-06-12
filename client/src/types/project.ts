export interface Project {
  id: string
  name: string
  createdAt: string
}

import type { VersionStatus } from "./version"

export interface ProjectSummary extends Project {
  versionCount: number
  updatedAt: string
  openCommentCount: number
  /** Latest version status, or pending_review when the project has no versions yet. */
  status: VersionStatus
}
