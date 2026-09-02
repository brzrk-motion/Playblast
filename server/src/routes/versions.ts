import fs from "node:fs"
import { Router } from "express"
import { getVideoPath } from "../config/paths.js"
import { requireCapability } from "../middleware/authorization.js"
import {
  getProject,
  getVersion,
  updateVersionLabel,
  updateVersionStatus,
} from "../storage/index.js"
import { isVersionStatus } from "../types/version.js"
import { buildVersionDownloadFilename } from "../utils/download-filename.js"
import { getVideoContentType } from "../utils/mime.js"
import { getParam } from "../utils/params.js"
import { SAFE_SEGMENT } from "../middleware/validateParams.js"
import { requireVersionStudio } from "./route-helpers.js"
import { pipeVideo } from "./video.js"

const versionsRouter = Router()

versionsRouter.patch(
  "/:versionId/status",
  requireCapability("approval.mutate"),
  (req, res) => {
  const versionId = getParam(req.params.versionId)
  const context = requireVersionStudio(req, res, versionId)
  if (!context) {
    return
  }

  const existing = getVersion(versionId)

  if (!existing) {
    res.status(404).json({ error: "Version not found." })
    return
  }

  const status = req.body?.status

  if (!isVersionStatus(status)) {
    res.status(400).json({
      error:
        "status must be one of: pending_review, needs_revision, approved.",
    })
    return
  }

  const version = updateVersionStatus(versionId, status)
  res.json(version)
  },
)

versionsRouter.patch(
  "/:versionId/label",
  requireCapability("media.version"),
  (req, res) => {
  const versionId = getParam(req.params.versionId)
  const context = requireVersionStudio(req, res, versionId)
  if (!context) {
    return
  }

  const existing = getVersion(versionId)

  if (!existing) {
    res.status(404).json({ error: "Version not found." })
    return
  }

  const label = typeof req.body?.label === "string" ? req.body.label.trim() : ""

  if (!label) {
    res.status(400).json({ error: "label is required." })
    return
  }

  if (!SAFE_SEGMENT.test(label)) {
    res.status(400).json({
      error:
        "label must contain only letters, numbers, dots, underscores, and hyphens.",
    })
    return
  }

  const result = updateVersionLabel(versionId, label)

  if (result === "not_found") {
    res.status(404).json({ error: "Version not found." })
    return
  }

  if (result === "conflict") {
    res.status(409).json({ error: "A version with that label already exists." })
    return
  }

  res.json(result)
  },
)

versionsRouter.get(
  "/:versionId/download",
  requireCapability("downloads.read"),
  (req, res) => {
  const versionId = getParam(req.params.versionId)
  const context = requireVersionStudio(req, res, versionId)
  if (!context) {
    return
  }

  const version = getVersion(versionId)

  if (!version) {
    res.status(404).json({ error: "Version not found." })
    return
  }

  const project = getProject(version.projectId)
  if (!project) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  const videoPath = getVideoPath(
    version.projectId,
    version.deliverableId,
    version.label,
    version.filename,
  )
  if (!videoPath) {
    res.status(400).json({ error: "Invalid filename" })
    return
  }

  let stat: fs.Stats
  try {
    stat = fs.statSync(videoPath)
  } catch {
    res.status(404).json({ error: "Video not found" })
    return
  }

  if (!stat.isFile()) {
    res.status(404).json({ error: "Video not found" })
    return
  }

  const downloadFilename = buildVersionDownloadFilename(
    project.name,
    version.label,
    version.filename,
  )

  res.status(200)
  res.set({
    "Content-Length": String(stat.size),
    "Content-Type": getVideoContentType(version.filename),
    "Content-Disposition": `attachment; filename="${downloadFilename}"`,
  })

  pipeVideo(res, videoPath)
  },
)

export default versionsRouter
