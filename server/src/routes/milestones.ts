import { Router } from "express"
import {
  createMilestone,
  deleteMilestone,
  getMilestone,
  getProject,
  listMilestones,
  updateMilestone,
} from "../storage/index.js"
import type { UpdateMilestoneInput } from "../types/index.js"
import { getParam, getProjectIdParam } from "../utils/params.js"

const milestonesRouter = Router({ mergeParams: true })

milestonesRouter.get("/", (req, res) => {
  const projectId = getProjectIdParam(req)

  if (!getProject(projectId)) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  res.json(listMilestones(projectId))
})

milestonesRouter.post("/", (req, res) => {
  const projectId = getProjectIdParam(req)

  if (!getProject(projectId)) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    res.status(400).json({ error: "Milestone name is required." })
    return
  }

  if (req.body?.done !== undefined && typeof req.body.done !== "boolean") {
    res.status(400).json({ error: "done must be a boolean." })
    return
  }

  const milestone = createMilestone({
    projectId,
    name,
    done: req.body?.done,
    dueDate: typeof req.body?.dueDate === "string" ? req.body.dueDate : undefined,
  })

  res.status(201).json(milestone)
})

const milestoneByIdRouter = Router()

milestoneByIdRouter.patch("/:milestoneId", (req, res) => {
  const milestoneId = getParam(req.params.milestoneId)
  const existing = getMilestone(milestoneId)

  if (!existing) {
    res.status(404).json({ error: "Milestone not found." })
    return
  }

  const input: UpdateMilestoneInput = {}

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

  if (req.body?.dueDate !== undefined) {
    input.dueDate =
      typeof req.body.dueDate === "string" && req.body.dueDate
        ? req.body.dueDate
        : null
  }

  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "No valid fields to update." })
    return
  }

  const updated = updateMilestone(milestoneId, input)
  res.json(updated)
})

milestoneByIdRouter.delete("/:milestoneId", (req, res) => {
  const milestoneId = getParam(req.params.milestoneId)
  const deleted = deleteMilestone(milestoneId)

  if (!deleted) {
    res.status(404).json({ error: "Milestone not found." })
    return
  }

  res.status(204).send()
})

export { milestoneByIdRouter }
export default milestonesRouter
