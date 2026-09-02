import type { FrameAnnotation } from "./annotation.js"

export interface Comment {
  id: string
  versionId: string
  /** Timestamp in seconds within the video */
  timestamp: number
  body: string
  author: string
  /** Server-derived authorship; null for legacy comments before Phase 5. */
  authorUserId?: string | null
  createdAt: string
  resolved: boolean
  annotation?: FrameAnnotation
}

export interface CreateCommentInput {
  versionId: string
  timestamp: number
  body: string
  author: string
  authorUserId?: string
  annotation?: FrameAnnotation
}

export interface UpdateCommentInput {
  body?: string
  resolved?: boolean
}
