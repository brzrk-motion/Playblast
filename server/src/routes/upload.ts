import { Router } from "express"
import { createUploadMiddleware } from "../middleware/upload.js"
import type { UploadResponse } from "../types/upload.js"
import { getParam } from "../utils/params.js"

const uploadRouter = Router({ mergeParams: true })

uploadRouter.post("/", createUploadMiddleware(), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided. Use the 'video' field." })
    return
  }

  const response: UploadResponse = {
    filename: req.file.filename,
    size: req.file.size,
    duration: null,
    projectId: getParam(req.params.projectId),
    version: getParam(req.params.version),
  }

  res.status(201).json(response)
})

export default uploadRouter
