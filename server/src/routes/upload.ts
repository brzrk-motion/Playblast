import { Router } from "express"
import { createUploadMiddleware } from "../middleware/upload.js"
import { createVersion, ensureProject } from "../storage/index.js"
import type { UploadResponse } from "../types/upload.js"
import { getVersionRouteParams } from "../utils/params.js"

const uploadRouter = Router({ mergeParams: true })

uploadRouter.post("/", createUploadMiddleware(), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided. Use the 'video' field." })
    return
  }

  const { projectId, version: versionLabel } = getVersionRouteParams(req)

  ensureProject(projectId)

  const version = createVersion({
    projectId,
    label: versionLabel,
    filename: req.file.filename,
  })

  const response: UploadResponse = {
    filename: req.file.filename,
    size: req.file.size,
    duration: null,
    projectId,
    version: versionLabel,
    versionId: version.id,
  }

  res.status(201).json(response)
})

export default uploadRouter
