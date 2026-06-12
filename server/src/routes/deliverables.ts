import fs from "node:fs"
import { Router } from "express"
import { getDeliverableUploadDir } from "../config/paths.js"
import {
  createDeliverable,
  deleteDeliverable,
  getDeliverable,
  getProject,
  listDeliverableSummaries,
  listVersions,
  updateDeliverable,
  updateDeliverableStatus,
} from "../storage/index.js"
import type { UpdateDeliverableInput } from "../types/index.js"
import { isDeliverableStatus } from "../types/index.js"
import { getParam, getProjectIdParam } from "../utils/params.js"

const deliverablesRouter = Router({ mergeParams: true })

deliverablesRouter.get("/", (req, res) => {
  const projectId = getProjectIdParam(req)

  if (!getProject(projectId)) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  res.json(listDeliverableSummaries(projectId))
})

deliverablesRouter.post("/", (req, res) => {
  const projectId = getProjectIdParam(req)

  if (!getProject(projectId)) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    res.status(400).json({ error: "Deliverable name is required." })
    return
  }

  const status = req.body?.status
  if (status !== undefined && !isDeliverableStatus(status)) {
    res.status(400).json({
      error:
        "status must be one of: not_started, in_progress, in_review, approved, rejected.",
    })
    return
  }

  const deliverable = createDeliverable({
    projectId,
    name,
    status,
    description:
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : undefined,
    dueDate: typeof req.body?.dueDate === "string" ? req.body.dueDate : undefined,
  })

  res.status(201).json(deliverable)
})

const deliverableByIdRouter = Router()

deliverableByIdRouter.get("/:deliverableId", (req, res) => {
  const deliverableId = getParam(req.params.deliverableId)
  const deliverable = getDeliverable(deliverableId)

  if (!deliverable) {
    res.status(404).json({ error: "Deliverable not found." })
    return
  }

  res.json(deliverable)
})

deliverableByIdRouter.get("/:deliverableId/versions", (req, res) => {
  const deliverableId = getParam(req.params.deliverableId)
  const deliverable = getDeliverable(deliverableId)

  if (!deliverable) {
    res.status(404).json({ error: "Deliverable not found." })
    return
  }

  res.json(listVersions(deliverableId))
})

deliverableByIdRouter.patch("/:deliverableId", (req, res) => {
  const deliverableId = getParam(req.params.deliverableId)
  const existing = getDeliverable(deliverableId)

  if (!existing) {
    res.status(404).json({ error: "Deliverable not found." })
    return
  }

  const input: UpdateDeliverableInput = {}

  if (req.body?.name !== undefined) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      res.status(400).json({ error: "name must be a non-empty string." })
      return
    }
    input.name = req.body.name.trim()
  }

  if (req.body?.status !== undefined) {
    if (!isDeliverableStatus(req.body.status)) {
      res.status(400).json({
        error:
          "status must be one of: not_started, in_progress, in_review, approved, rejected.",
      })
      return
    }
    input.status = req.body.status
  }

  if (req.body?.description !== undefined) {
    input.description =
      typeof req.body.description === "string"
        ? req.body.description.trim() || null
        : null
  }

  if (req.body?.dueDate !== undefined) {
    input.dueDate =
      typeof req.body.dueDate === "string" && req.body.dueDate
        ? req.body.dueDate
        : null
  }

  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "No valid fields to update." })
    return
  }

  const updated = updateDeliverable(deliverableId, input)
  res.json(updated)
})

deliverableByIdRouter.patch("/:deliverableId/status", (req, res) => {
  const deliverableId = getParam(req.params.deliverableId)
  const existing = getDeliverable(deliverableId)

  if (!existing) {
    res.status(404).json({ error: "Deliverable not found." })
    return
  }

  if (!isDeliverableStatus(req.body?.status)) {
    res.status(400).json({
      error:
        "status must be one of: not_started, in_progress, in_review, approved, rejected.",
    })
    return
  }

  const updated = updateDeliverableStatus(deliverableId, req.body.status)
  res.json(updated)
})

deliverableByIdRouter.delete("/:deliverableId", (req, res) => {
  const deliverableId = getParam(req.params.deliverableId)
  const existing = getDeliverable(deliverableId)

  if (!existing) {
    res.status(404).json({ error: "Deliverable not found." })
    return
  }

  const uploadDir = getDeliverableUploadDir(existing.projectId, deliverableId)
  deleteDeliverable(deliverableId)

  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true })
  }

  res.status(204).send()
})

export { deliverableByIdRouter }
export default deliverablesRouter
