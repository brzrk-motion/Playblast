import type { Capability } from "@playblast/shared"
import { hasCapability } from "@playblast/shared"
import type { Comment } from "../types/comment.js"

export interface CommentActor {
  userId: string
  role: "admin" | "creative" | "proofing"
}

export interface CommentMutation {
  body?: string
  resolved?: boolean
}

export type CommentPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: "forbidden" | "not_found" }

function isAuthor(comment: Comment, actor: CommentActor): boolean {
  if (comment.authorUserId) {
    return comment.authorUserId === actor.userId
  }

  return false
}

export function canCreateComment(
  role: CommentActor["role"],
): CommentPolicyDecision {
  if (!hasCapability(role, "comments.create")) {
    return { allowed: false, reason: "forbidden" }
  }

  return { allowed: true }
}

export function canUpdateComment(
  comment: Comment,
  actor: CommentActor,
  mutation: CommentMutation,
): CommentPolicyDecision {
  if (mutation.resolved !== undefined) {
    if (!hasCapability(actor.role, "approval.mutate")) {
      return { allowed: false, reason: "forbidden" }
    }

    return { allowed: true }
  }

  if (mutation.body !== undefined) {
    if (actor.role === "admin") {
      return { allowed: true }
    }

    if (!hasCapability(actor.role, "comments.create")) {
      return { allowed: false, reason: "forbidden" }
    }

    if (!isAuthor(comment, actor)) {
      return { allowed: false, reason: "forbidden" }
    }

    return { allowed: true }
  }

  return { allowed: false, reason: "forbidden" }
}

export function canDeleteComment(
  comment: Comment,
  actor: CommentActor,
): CommentPolicyDecision {
  if (!hasCapability(actor.role, "comments.create")) {
    return { allowed: false, reason: "forbidden" }
  }

  if (actor.role === "admin") {
    return { allowed: true }
  }

  if (!isAuthor(comment, actor)) {
    return { allowed: false, reason: "forbidden" }
  }

  return { allowed: true }
}

export function requiredCapabilityForCommentRoute(
  method: "GET" | "POST" | "PATCH" | "DELETE",
): Capability | null {
  switch (method) {
    case "GET":
      return "review.play"
    case "POST":
      return "comments.create"
    case "PATCH":
      return null
    case "DELETE":
      return null
    default:
      return null
  }
}
