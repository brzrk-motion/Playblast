export interface Project {
  id: string
  name: string
  createdAt: string
}

import type { VersionStatus } from "./version.js"

export interface ProjectSummary extends Project {
  versionCount: number
  updatedAt: string
  openCommentCount: number
  /** Latest version status, or pending_review when the project has no versions yet. */
  status: VersionStatus
}

export interface CreateProjectInput {
  name: string
  /** Optional stable id (e.g. upload folder slug). A UUID is generated when omitted. */
  id?: string
}
