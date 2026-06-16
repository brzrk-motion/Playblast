import { Router } from "express"
import {
  createTimeLog,
  deleteTimeLog,
  getTask,
  getTimeLog,
  listTimeLogs,
} from "../storage/index.js"
import { getParam } from "../utils/params.js"

function getTaskIdParam(req: {
  params: { taskId?: string | string[] }
}): string {
  return getParam(req.params.taskId ?? "")
}

const timeLogsRouter = Router({ mergeParams: true })

timeLogsRouter.get("/", (req, res) => {
  const taskId = getTaskIdParam(req)

  if (!getTask(taskId)) {
    res.status(404).json({ error: "Task not found." })
    return
  }

  res.json(listTimeLogs(taskId))
})

timeLogsRouter.post("/", (req, res) => {
  const taskId = getTaskIdParam(req)

  if (!getTask(taskId)) {
    res.status(404).json({ error: "Task not found." })
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

timeLogByIdRouter.delete("/:timeLogId", (req, res) => {
  const timeLogId = getParam(req.params.timeLogId)
  const existing = getTimeLog(timeLogId)

  if (!existing) {
    res.status(404).json({ error: "Time log not found." })
    return
  }

  deleteTimeLog(timeLogId)
  res.status(204).send()
})

export { timeLogByIdRouter }
export default timeLogsRouter
