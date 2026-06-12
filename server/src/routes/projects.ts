import fs from "node:fs"
import { Router } from "express"
import { getProjectUploadDir } from "../config/paths.js"
import {
  validateProjectIdParam,
  validateProjectParams,
} from "../middleware/validateParams.js"
import {
  createProject,
  deleteProject,
  getProject,
  listProjectSummaries,
  listVersionsByProject,
  updateProject,
} from "../storage/index.js"
import { parseProjectBudget, parseProjectPatch } from "../lib/project-input.js"
import { isProjectStatus } from "../types/index.js"
import { getParam } from "../utils/params.js"

const projectsRouter = Router()

projectsRouter.get("/", (_req, res) => {
  res.json(listProjectSummaries())
})

projectsRouter.post("/", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  const id =
    typeof req.body?.id === "string" && req.body.id.trim()
      ? req.body.id.trim()
      : undefined

  if (!name) {
    res.status(400).json({ error: "Project name is required." })
    return
  }

  if (id && getProject(id)) {
    res.status(409).json({ error: "A project with this id already exists." })
    return
  }

  const status = req.body?.status
  if (status !== undefined && !isProjectStatus(status)) {
    res.status(400).json({
      error: "status must be one of: active, on_hold, completed, archived.",
    })
    return
  }

  let budget
  if (req.body?.budget !== undefined && req.body?.budget !== null) {
    const parsedBudget = parseProjectBudget(req.body.budget)
    if ("error" in parsedBudget) {
      res.status(400).json({ error: parsedBudget.error })
      return
    }
    budget = parsedBudget.budget
  }

  const project = createProject({
    name,
    id,
    status,
    client: typeof req.body?.client === "string" ? req.body.client.trim() : undefined,
    description:
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : undefined,
    startDate:
      typeof req.body?.startDate === "string" ? req.body.startDate : undefined,
    endDate: typeof req.body?.endDate === "string" ? req.body.endDate : undefined,
    budget,
  })
  res.status(201).json(project)
})

projectsRouter.get("/:projectId", (req, res) => {
  const projectId = getParam(req.params.projectId)
  const project = getProject(projectId)

  if (!project) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  res.json(project)
})

projectsRouter.patch("/:projectId", (req, res) => {
  const projectId = getParam(req.params.projectId)
  const project = getProject(projectId)

  if (!project) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  const parsed = parseProjectPatch(req.body)
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const updated = updateProject(projectId, parsed.input)
  res.json(updated)
})

projectsRouter.delete(
  "/:projectId",
  validateProjectIdParam,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const deleted = deleteProject(projectId)

    if (!deleted) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    const uploadDir = getProjectUploadDir(projectId)
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true })
    }

    res.status(204).send()
  },
)

projectsRouter.get(
  "/:projectId/versions",
  validateProjectParams,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const project = getProject(projectId)

    if (!project) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    res.json(listVersionsByProject(projectId))
  },
)

export default projectsRouter
