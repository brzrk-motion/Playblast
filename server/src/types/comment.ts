import type { FrameAnnotation } from "./annotation.js"

export interface Comment {
  id: string
  versionId: string
  /** Timestamp in seconds within the video */
  timestamp: number
  body: string
  author: string
  createdAt: string
  resolved: boolean
  annotation?: FrameAnnotation
}

export interface CreateCommentInput {
  versionId: string
  timestamp: number
  body: string
  author: string
  annotation?: FrameAnnotation
}

export interface UpdateCommentInput {
  body?: string
  resolved?: boolean
}
