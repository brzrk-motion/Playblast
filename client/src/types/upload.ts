export interface UploadResponse {
  filename: string
  size: number
  duration: null
  projectId: string
  deliverableId: string
  version: string
  versionId: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}
