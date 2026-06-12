export interface Project {
  id: string
  name: string
  createdAt: string
}

export interface ProjectSummary extends Project {
  versionCount: number
  updatedAt: string
  openCommentCount: number
}
