export interface Version {
  id: string
  projectId: string
  /** Human-readable label such as v1, v2 */
  label: string
  filename: string
  uploadedAt: string
}

export interface CreateVersionInput {
  projectId: string
  label: string
  filename: string
}
