import type { NextFunction, Request, Response } from "express"
import { Router } from "express"
import { createUploadMiddleware } from "../middleware/upload.js"
import { createVersion, getProject } from "../storage/index.js"
import type { UploadResponse } from "../types/upload.js"
import { getParam, getVersionRouteParams } from "../utils/params.js"

const uploadRouter = Router({ mergeParams: true })

function requireProject(req: Request, res: Response, next: NextFunction) {
  const projectId = getParam(req.params.projectId)

  if (!getProject(projectId)) {
    res.status(404).json({ error: `Project '${projectId}' not found` })
    return
  }

  next()
}

uploadRouter.post("/", requireProject, createUploadMiddleware(), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided. Use the 'video' field." })
    return
  }

  const { projectId, version: versionLabel } = getVersionRouteParams(req)

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
