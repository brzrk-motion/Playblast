import { Router } from "express"
import { getVersion, updateVersionStatus } from "../storage/index.js"
import { isVersionStatus } from "../types/version.js"
import { getParam } from "../utils/params.js"

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

export default versionsRouter
