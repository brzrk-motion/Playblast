import type { FrameAnnotation } from "@/types/annotation"

export interface Comment {
  id: string
  versionId: string
  /** Timestamp in seconds */
  timestamp: number
  body: string
  author: string
  authorUserId?: string | null
  createdAt: string
  resolved: boolean
  /** Optional frame-level drawing annotation tied to this timestamp */
  annotation?: FrameAnnotation
}
