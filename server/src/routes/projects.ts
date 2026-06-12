import { Router } from "express"
import { validateProjectParams } from "../middleware/validateParams.js"
import {
  createProject,
  getProject,
  listProjects,
  listVersions,
} from "../storage/index.js"
import { getParam } from "../utils/params.js"

const projectsRouter = Router()

projectsRouter.get("/", (_req, res) => {
  res.json(listProjects())
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

  const project = createProject({ name, id })
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

    res.json(listVersions(projectId))
  },
)

export default projectsRouter
