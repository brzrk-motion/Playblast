export interface Comment {
  id: string
  versionId: string
  /** Timestamp in seconds within the video */
  timestamp: number
  body: string
  author: string
  createdAt: string
  resolved: boolean
}

export interface CreateCommentInput {
  versionId: string
  timestamp: number
  body: string
  author: string
}

export interface UpdateCommentInput {
  body?: string
  resolved?: boolean
}
