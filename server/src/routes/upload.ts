import type { NextFunction, Request, Response } from "express"
import { Router } from "express"
import { requireCapability } from "../middleware/authorization.js"
import { createUploadMiddleware } from "../middleware/upload.js"
import {
  createVersion,
  getDeliverable,
  getVersionByLabel,
} from "../storage/index.js"
import type { UploadResponse } from "../types/upload.js"
import { getParam, getVersionRouteParams } from "../utils/params.js"
import { requireDeliverableStudio } from "./route-helpers.js"
import {
  removeStaleVersionFile,
  removeUploadedFile,
} from "./upload-cleanup.js"

const uploadRouter = Router({ mergeParams: true })

function requireDeliverable(req: Request, res: Response, next: NextFunction) {
  const deliverableId = getParam(req.params.deliverableId)
  const context = requireDeliverableStudio(req, res, deliverableId)
  if (!context) {
    return
  }

  const deliverable = getDeliverable(deliverableId)

  if (!deliverable) {
    res.status(404).json({ error: `Deliverable '${deliverableId}' not found` })
    return
  }

  req.params.projectId = deliverable.projectId
  next()
}

uploadRouter.post(
  "/",
  requireCapability("media.upload"),
  requireDeliverable,
  createUploadMiddleware(),
  (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided. Use the 'video' field." })
    return
  }

  const { deliverableId, version: versionLabel } = getVersionRouteParams(req)
  const projectId = getParam(req.params.projectId)
  const existingVersion = getVersionByLabel(deliverableId, versionLabel)
  const previousFilename = existingVersion?.filename

  let version
  try {
    version = createVersion({
      projectId,
      deliverableId,
      label: versionLabel,
      filename: req.file.filename,
    })
  } catch {
    removeUploadedFile(req.file)
    res.status(500).json({ error: "Failed to save uploaded version." })
    return
  }

  if (previousFilename && previousFilename !== req.file.filename) {
    removeStaleVersionFile(
      projectId,
      deliverableId,
      versionLabel,
      previousFilename,
    )
  }

  const response: UploadResponse = {
    filename: req.file.filename,
    size: req.file.size,
    duration: null,
    projectId,
    deliverableId,
    version: versionLabel,
    versionId: version.id,
  }

  res.status(201).json(response)
  },
)

export default uploadRouter
