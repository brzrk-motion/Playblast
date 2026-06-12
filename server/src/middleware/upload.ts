import fs from "node:fs"
import path from "node:path"
import multer from "multer"
import type { NextFunction, Request, Response } from "express"
import { getMaxUploadSizeBytes } from "../config/env.js"
import { getUploadDir } from "../config/paths.js"
import { getParam } from "../utils/params.js"

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const projectId = getParam(req.params.projectId)
    const version = getParam(req.params.version)
    const uploadDir = getUploadDir(projectId, version)

    fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext)
    const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, "_")
    cb(null, `${safeBase}${ext}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: getMaxUploadSizeBytes() },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true)
      return
    }
    cb(new Error("Only video files are allowed"))
  },
})

export function createUploadMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single("video")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: "File too large" })
          return
        }
        res.status(400).json({ error: err.message })
        return
      }
      if (err) {
        res.status(400).json({ error: err.message })
        return
      }
      next()
    })
  }
}
