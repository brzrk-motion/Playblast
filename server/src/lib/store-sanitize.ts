import type { Comment } from "../types/comment.js"
import type { DataStore } from "../types/store.js"

const PLACEHOLDER_COMMENT_PATTERNS = [/update customize text here/i]

export function isPlaceholderComment(comment: Comment): boolean {
  const body = comment.body.trim()
  return PLACEHOLDER_COMMENT_PATTERNS.some((pattern) => pattern.test(body))
}

export function sanitizeStore(store: DataStore): DataStore {
  const comments = store.comments.filter((comment) => !isPlaceholderComment(comment))

  if (comments.length === store.comments.length) {
    return store
  }

  return {
    ...store,
    comments,
  }
}
