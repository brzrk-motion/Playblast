export interface Comment {
  id: string
  /** Timestamp in seconds */
  timestamp: number
  body: string
  author: string
  createdAt?: string
}
