import { Router } from "express"
import {
  createComment,
  deleteComment,
  getComment,
  getProject,
  getVersionByLabel,
  listComments,
  updateComment,
} from "../storage/index.js"
import { getParam, getVersionRouteParams } from "../utils/params.js"

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

  const timestamp = req.body?.timestamp
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : ""
  const author =
    typeof req.body?.author === "string" ? req.body.author.trim() : ""

  if (typeof timestamp !== "number" || Number.isNaN(timestamp) || timestamp < 0) {
    res.status(400).json({ error: "A non-negative numeric timestamp is required." })
    return
  }

  if (!body) {
    res.status(400).json({ error: "Comment body is required." })
    return
  }

  if (!author) {
    res.status(400).json({ error: "Comment author is required." })
    return
  }

  const comment = createComment({
    versionId: version.id,
    timestamp,
    body,
    author,
  })

  res.status(201).json(comment)
})

const commentByIdRouter = Router()

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
