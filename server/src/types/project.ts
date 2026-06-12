export interface Project {
  id: string
  name: string
  createdAt: string
}

export interface ProjectSummary extends Project {
  versionCount: number
  updatedAt: string
}

export interface CreateProjectInput {
  name: string
  /** Optional stable id (e.g. upload folder slug). A UUID is generated when omitted. */
  id?: string
}
