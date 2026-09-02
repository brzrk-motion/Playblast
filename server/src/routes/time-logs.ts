import { Router } from "express"
import { requireAdminOnly } from "../middleware/authorization.js"
import {
  createTimeLog,
  deleteTimeLog,
  getTimeLog,
  listTimeLogs,
  updateTimeLog,
} from "../storage/index.js"
import { getParam } from "../utils/params.js"
import { requireTaskStudio, requireTimeLogStudio } from "./route-helpers.js"

function getTaskIdParam(req: {
  params: { taskId?: string | string[] }
}): string {
  return getParam(req.params.taskId ?? "")
}

const timeLogsRouter = Router({ mergeParams: true })

timeLogsRouter.use(requireAdminOnly())

timeLogsRouter.get("/", (req, res) => {
  const taskId = getTaskIdParam(req)
  const context = requireTaskStudio(req, res, taskId)
  if (!context) {
    return
  }

  res.json(listTimeLogs(taskId))
})

timeLogsRouter.post("/", (req, res) => {
  const taskId = getTaskIdParam(req)
  const context = requireTaskStudio(req, res, taskId)
  if (!context) {
    return
  }

  const durationHours = Number(req.body?.durationHours)
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    res.status(400).json({ error: "durationHours must be a positive number." })
    return
  }

  if (
    req.body?.loggedAt !== undefined &&
    (typeof req.body.loggedAt !== "string" || !req.body.loggedAt.trim())
  ) {
    res.status(400).json({ error: "loggedAt must be a non-empty string." })
    return
  }

  if (req.body?.notes !== undefined && typeof req.body.notes !== "string") {
    res.status(400).json({ error: "notes must be a string." })
    return
  }

  const entry = createTimeLog({
    taskId,
    durationHours,
    loggedAt:
      typeof req.body?.loggedAt === "string" ? req.body.loggedAt.trim() : undefined,
    notes:
      typeof req.body?.notes === "string" ? req.body.notes.trim() || undefined : undefined,
  })

  res.status(201).json(entry)
})

const timeLogByIdRouter = Router()

timeLogByIdRouter.use(requireAdminOnly())

timeLogByIdRouter.delete("/:timeLogId", (req, res) => {
  const timeLogId = getParam(req.params.timeLogId)
  const context = requireTimeLogStudio(req, res, timeLogId)
  if (!context) {
    return
  }

  const existing = getTimeLog(timeLogId)

  if (!existing) {
    res.status(404).json({ error: "Time log not found." })
    return
  }

  deleteTimeLog(timeLogId)
  res.status(204).send()
})

timeLogByIdRouter.patch("/:timeLogId", (req, res) => {
  const timeLogId = getParam(req.params.timeLogId)
  const context = requireTimeLogStudio(req, res, timeLogId)
  if (!context) {
    return
  }

  const existing = getTimeLog(timeLogId)

  if (!existing) {
    res.status(404).json({ error: "Time log not found." })
    return
  }

  const hasDuration = req.body?.durationHours !== undefined
  const hasLoggedAt = req.body?.loggedAt !== undefined
  const hasNotes = req.body?.notes !== undefined

  if (!hasDuration && !hasLoggedAt && !hasNotes) {
    res.status(400).json({ error: "No updatable fields provided." })
    return
  }

  if (hasDuration) {
    const durationHours = Number(req.body.durationHours)
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      res.status(400).json({ error: "durationHours must be a positive number." })
      return
    }
  }

  if (
    hasLoggedAt &&
    (typeof req.body.loggedAt !== "string" || !req.body.loggedAt.trim())
  ) {
    res.status(400).json({ error: "loggedAt must be a non-empty string." })
    return
  }

  if (hasNotes && req.body.notes !== null && typeof req.body.notes !== "string") {
    res.status(400).json({ error: "notes must be a string or null." })
    return
  }

  try {
    const entry = updateTimeLog(timeLogId, {
      ...(hasDuration ? { durationHours: Number(req.body.durationHours) } : {}),
      ...(hasLoggedAt ? { loggedAt: req.body.loggedAt.trim() } : {}),
      ...(hasNotes
        ? {
            notes:
              req.body.notes === null
                ? null
                : req.body.notes.trim() || undefined,
          }
        : {}),
    })

    if (!entry) {
      res.status(404).json({ error: "Time log not found." })
      return
    }

    res.json(entry)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update time log."
    res.status(400).json({ error: message })
  }
})

export { timeLogByIdRouter }
export default timeLogsRouter
