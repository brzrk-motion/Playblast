import { Router } from "express"
import { sendApiError } from "../lib/api-response.js"
import {
  canCreateComment,
  canDeleteComment,
  canUpdateComment,
} from "../auth/comment-policy.js"
import { parseFrameAnnotation } from "../lib/annotation.js"
import { requireCapability } from "../middleware/authorization.js"
import {
  createComment,
  deleteComment,
  getComment,
  getVersion,
  getVersionByLabel,
  listComments,
  updateComment,
} from "../storage/index.js"
import type { FrameAnnotation } from "../types/annotation.js"
import { getParam, getVersionRouteParams } from "../utils/params.js"
import {
  requireCommentStudio,
  requireDeliverableStudio,
  requireVersionStudio,
  requireStudioSession,
} from "./route-helpers.js"

function parseCreateCommentBody(body: unknown): {
  timestamp: number
  text: string
  annotation?: FrameAnnotation
} | { error: string } {
  const timestamp = (body as { timestamp?: unknown })?.timestamp
  const text =
    typeof (body as { body?: unknown })?.body === "string"
      ? (body as { body: string }).body.trim()
      : ""

  if (typeof timestamp !== "number" || Number.isNaN(timestamp) || timestamp < 0) {
    return { error: "A non-negative numeric timestamp is required." }
  }

  if (!text) {
    return { error: "Comment body is required." }
  }

  const annotationInput = (body as { annotation?: unknown })?.annotation

  if (annotationInput === undefined) {
    return { timestamp, text }
  }

  const parsedAnnotation = parseFrameAnnotation(annotationInput)
  if ("error" in parsedAnnotation) {
    return parsedAnnotation
  }

  if (Math.abs(parsedAnnotation.timestamp - timestamp) > 0.05) {
    return { error: "Annotation timestamp must match the comment timestamp." }
  }

  return { timestamp, text, annotation: parsedAnnotation }
}

const commentsRouter = Router({ mergeParams: true })

commentsRouter.get("/", requireCapability("review.play"), (req, res) => {
  const { deliverableId, version: versionLabel } = getVersionRouteParams(req)
  const context = requireDeliverableStudio(req, res, deliverableId)
  if (!context) {
    return
  }

  const version = getVersionByLabel(deliverableId, versionLabel)
  if (!version) {
    res.status(404).json({ error: "Version not found." })
    return
  }

  res.json(listComments(version.id))
})

commentsRouter.post("/", requireCapability("comments.create"), (req, res) => {
  const { deliverableId, version: versionLabel } = getVersionRouteParams(req)
  const context = requireDeliverableStudio(req, res, deliverableId)
  if (!context) {
    return
  }

  const version = getVersionByLabel(deliverableId, versionLabel)
  if (!version) {
    res.status(404).json({ error: "Version not found." })
    return
  }

  const policy = canCreateComment(context.role)
  if (!policy.allowed) {
    sendApiError(res, "FORBIDDEN")
    return
  }

  const parsed = parseCreateCommentBody(req.body)
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const comment = createComment({
    versionId: version.id,
    timestamp: parsed.timestamp,
    body: parsed.text,
    author: context.userName,
    authorUserId: context.userId,
    annotation: parsed.annotation,
  })

  res.status(201).json(comment)
})

const commentByIdRouter = Router()

commentByIdRouter.get("/", requireCapability("review.play"), (req, res) => {
  const versionId =
    typeof req.query.versionId === "string" ? req.query.versionId.trim() : ""

  if (!versionId) {
    res.status(400).json({ error: "versionId query parameter is required." })
    return
  }

  const context = requireVersionStudio(req, res, versionId)
  if (!context) {
    return
  }

  res.json(listComments(versionId))
})

commentByIdRouter.post("/", requireCapability("comments.create"), (req, res) => {
  const context = requireStudioSession(req, res)
  if (!context) {
    return
  }

  const versionId =
    typeof req.body?.versionId === "string" ? req.body.versionId.trim() : ""

  if (!versionId) {
    res.status(400).json({ error: "versionId is required." })
    return
  }

  const versionContext = requireVersionStudio(req, res, versionId)
  if (!versionContext) {
    return
  }

  const policy = canCreateComment(versionContext.role)
  if (!policy.allowed) {
    sendApiError(res, "FORBIDDEN")
    return
  }

  const parsed = parseCreateCommentBody(req.body)
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const comment = createComment({
    versionId,
    timestamp: parsed.timestamp,
    body: parsed.text,
    author: versionContext.userName,
    authorUserId: versionContext.userId,
    annotation: parsed.annotation,
  })

  res.status(201).json(comment)
})

commentByIdRouter.patch(
  "/:commentId/resolve",
  requireCapability("approval.mutate"),
  (req, res) => {
  const commentId = getParam(req.params.commentId)
  const context = requireCommentStudio(req, res, commentId)
  if (!context) {
    return
  }

  const existing = getComment(commentId)
  if (!existing) {
    res.status(404).json({ error: "Comment not found." })
    return
  }

  if (typeof req.body?.resolved !== "boolean") {
    res.status(400).json({ error: "resolved must be a boolean." })
    return
  }

  const policy = canUpdateComment(
    existing,
    { userId: context.userId, role: context.role },
    { resolved: req.body.resolved },
  )
  if (!policy.allowed) {
    sendApiError(res, "FORBIDDEN")
    return
  }

  const comment = updateComment(commentId, { resolved: req.body.resolved })
  res.json(comment)
  },
)

commentByIdRouter.patch("/:commentId", requireCapability("comments.create"), (req, res) => {
  const commentId = getParam(req.params.commentId)
  const context = requireCommentStudio(req, res, commentId)
  if (!context) {
    return
  }

  const existing = getComment(commentId)
  if (!existing) {
    res.status(404).json({ error: "Comment not found." })
    return
  }

  const input: { body?: string; resolved?: boolean } = {}

  if (req.body?.body !== undefined) {
    if (typeof req.body.body !== "string" || !req.body.body.trim()) {
      res.status(400).json({ error: "Comment body must be a non-empty string." })
      return
    }

    input.body = req.body.body.trim()
  }

  if (req.body?.resolved !== undefined) {
    if (typeof req.body.resolved !== "boolean") {
      res.status(400).json({ error: "resolved must be a boolean." })
      return
    }

    input.resolved = req.body.resolved
  }

  if (input.body === undefined && input.resolved === undefined) {
    res.status(400).json({ error: "No valid fields to update." })
    return
  }

  const policy = canUpdateComment(
    existing,
    { userId: context.userId, role: context.role },
    input,
  )
  if (!policy.allowed) {
    sendApiError(res, "FORBIDDEN")
    return
  }

  const comment = updateComment(commentId, input)
  res.json(comment)
})

commentByIdRouter.delete("/:commentId", requireCapability("comments.create"), (req, res) => {
  const commentId = getParam(req.params.commentId)
  const context = requireCommentStudio(req, res, commentId)
  if (!context) {
    return
  }

  const existing = getComment(commentId)
  if (!existing) {
    res.status(404).json({ error: "Comment not found." })
    return
  }

  const policy = canDeleteComment(existing, {
    userId: context.userId,
    role: context.role,
  })
  if (!policy.allowed) {
    sendApiError(res, "FORBIDDEN")
    return
  }

  const deleted = deleteComment(commentId)

  if (!deleted) {
    res.status(404).json({ error: "Comment not found." })
    return
  }

  res.status(204).send()
})

export { commentByIdRouter }
export default commentsRouter
