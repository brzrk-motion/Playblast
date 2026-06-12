import { Router } from "express"
import {
  createComment,
  deleteComment,
  getComment,
  getProject,
  getVersion,
  getVersionByLabel,
  listComments,
  updateComment,
} from "../storage/index.js"
import { getParam, getVersionRouteParams } from "../utils/params.js"

function parseCreateCommentBody(body: unknown): {
  timestamp: number
  text: string
  author: string
} | { error: string } {
  const timestamp = (body as { timestamp?: unknown })?.timestamp
  const text =
    typeof (body as { body?: unknown })?.body === "string"
      ? (body as { body: string }).body.trim()
      : ""
  const author =
    typeof (body as { author?: unknown })?.author === "string"
      ? (body as { author: string }).author.trim()
      : ""

  if (typeof timestamp !== "number" || Number.isNaN(timestamp) || timestamp < 0) {
    return { error: "A non-negative numeric timestamp is required." }
  }

  if (!text) {
    return { error: "Comment body is required." }
  }

  if (!author) {
    return { error: "Comment author is required." }
  }

  return { timestamp, text, author }
}

const commentsRouter = Router({ mergeParams: true })

commentsRouter.get("/", (req, res) => {
  const { projectId, version: versionLabel } = getVersionRouteParams(req)

  const project = getProject(projectId)
  if (!project) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  const version = getVersionByLabel(projectId, versionLabel)
  if (!version) {
    res.status(404).json({ error: "Version not found." })
    return
  }

  res.json(listComments(version.id))
})

commentsRouter.post("/", (req, res) => {
  const { projectId, version: versionLabel } = getVersionRouteParams(req)

  const project = getProject(projectId)
  if (!project) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  const version = getVersionByLabel(projectId, versionLabel)
  if (!version) {
    res.status(404).json({ error: "Version not found." })
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
    author: parsed.author,
  })

  res.status(201).json(comment)
})

const commentByIdRouter = Router()

commentByIdRouter.get("/", (req, res) => {
  const versionId =
    typeof req.query.versionId === "string" ? req.query.versionId.trim() : ""

  if (!versionId) {
    res.status(400).json({ error: "versionId query parameter is required." })
    return
  }

  const version = getVersion(versionId)
  if (!version) {
    res.status(404).json({ error: "Version not found." })
    return
  }

  res.json(listComments(versionId))
})

commentByIdRouter.post("/", (req, res) => {
  const versionId =
    typeof req.body?.versionId === "string" ? req.body.versionId.trim() : ""

  if (!versionId) {
    res.status(400).json({ error: "versionId is required." })
    return
  }

  const version = getVersion(versionId)
  if (!version) {
    res.status(404).json({ error: "Version not found." })
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
    author: parsed.author,
  })

  res.status(201).json(comment)
})

commentByIdRouter.patch("/:commentId", (req, res) => {
  const commentId = getParam(req.params.commentId)
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

  const comment = updateComment(commentId, input)
  res.json(comment)
})

commentByIdRouter.delete("/:commentId", (req, res) => {
  const commentId = getParam(req.params.commentId)
  const deleted = deleteComment(commentId)

  if (!deleted) {
    res.status(404).json({ error: "Comment not found." })
    return
  }

  res.status(204).send()
})

export { commentByIdRouter }
export default commentsRouter
