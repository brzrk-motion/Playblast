import { Router } from "express"
import {
  createTask,
  deleteTask,
  getMilestone,
  getTask,
  listTasks,
  updateTask,
} from "../storage/index.js"
import type { UpdateTaskInput } from "../types/index.js"
import { getParam } from "../utils/params.js"

function getMilestoneIdParam(req: {
  params: { milestoneId?: string | string[] }
}): string {
  return getParam(req.params.milestoneId ?? "")
}

const tasksRouter = Router({ mergeParams: true })

tasksRouter.get("/", (req, res) => {
  const milestoneId = getMilestoneIdParam(req)

  if (!getMilestone(milestoneId)) {
    res.status(404).json({ error: "Milestone not found." })
    return
  }

  res.json(listTasks(milestoneId))
})

tasksRouter.post("/", (req, res) => {
  const milestoneId = getMilestoneIdParam(req)

  if (!getMilestone(milestoneId)) {
    res.status(404).json({ error: "Milestone not found." })
    return
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    res.status(400).json({ error: "Task name is required." })
    return
  }

  if (req.body?.done !== undefined && typeof req.body.done !== "boolean") {
    res.status(400).json({ error: "done must be a boolean." })
    return
  }

  const task = createTask({
    milestoneId,
    name,
    done: req.body?.done,
  })

  res.status(201).json(task)
})

const taskByIdRouter = Router()

taskByIdRouter.patch("/:taskId", (req, res) => {
  const taskId = getParam(req.params.taskId)
  const existing = getTask(taskId)

  if (!existing) {
    res.status(404).json({ error: "Task not found." })
    return
  }

  const input: UpdateTaskInput = {}

  if (req.body?.name !== undefined) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      res.status(400).json({ error: "name must be a non-empty string." })
      return
    }
    input.name = req.body.name.trim()
  }

  if (req.body?.done !== undefined) {
    if (typeof req.body.done !== "boolean") {
      res.status(400).json({ error: "done must be a boolean." })
      return
    }
    input.done = req.body.done
  }

  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "No valid fields to update." })
    return
  }

  const updated = updateTask(taskId, input)
  res.json(updated)
})

taskByIdRouter.delete("/:taskId", (req, res) => {
  const taskId = getParam(req.params.taskId)
  const deleted = deleteTask(taskId)

  if (!deleted) {
    res.status(404).json({ error: "Task not found." })
    return
  }

  res.status(204).send()
})

export { taskByIdRouter }
export default tasksRouter
