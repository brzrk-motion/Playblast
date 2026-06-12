import { Router } from "express"
import {
  getVersion,
  updateVersionLabel,
  updateVersionStatus,
} from "../storage/index.js"
import { isVersionStatus } from "../types/version.js"
import { getParam } from "../utils/params.js"
import { SAFE_SEGMENT } from "../middleware/validateParams.js"

const versionsRouter = Router()

versionsRouter.patch("/:versionId/status", (req, res) => {
  const versionId = getParam(req.params.versionId)
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
})

versionsRouter.patch("/:versionId/label", (req, res) => {
  const versionId = getParam(req.params.versionId)
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
})

export default versionsRouter
