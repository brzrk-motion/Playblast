import type { NextFunction, Request, Response } from "express"
import { Router } from "express"
import { createUploadMiddleware } from "../middleware/upload.js"
import { createVersion, getDeliverable } from "../storage/index.js"
import type { UploadResponse } from "../types/upload.js"
import { getParam, getVersionRouteParams } from "../utils/params.js"

const uploadRouter = Router({ mergeParams: true })

function requireDeliverable(req: Request, res: Response, next: NextFunction) {
  const deliverableId = getParam(req.params.deliverableId)
  const deliverable = getDeliverable(deliverableId)

  if (!deliverable) {
    res.status(404).json({ error: `Deliverable '${deliverableId}' not found` })
    return
  }

  // Expose projectId so the multer destination can build the upload path.
  req.params.projectId = deliverable.projectId
  next()
}

uploadRouter.post("/", requireDeliverable, createUploadMiddleware(), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided. Use the 'video' field." })
    return
  }

  const { deliverableId, version: versionLabel } = getVersionRouteParams(req)
  const projectId = getParam(req.params.projectId)

  const version = createVersion({
    projectId,
    deliverableId,
    label: versionLabel,
    filename: req.file.filename,
  })

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
})

export default uploadRouter
