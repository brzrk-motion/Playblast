export interface Comment {
  id: string
  versionId: string
  /** Timestamp in seconds */
  timestamp: number
  body: string
  author: string
  createdAt: string
  resolved: boolean
}
