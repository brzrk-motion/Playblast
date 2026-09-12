import fs from "node:fs"
import { Router } from "express"
import { hasCapability, type UserRole } from "@playblast/shared"
import { getProjectUploadDir } from "../config/paths.js"
import { requireCapability } from "../middleware/authorization.js"
import {
  validateProjectIdParam,
  validateProjectParams,
} from "../middleware/validateParams.js"
import {
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getClient,
  getProject,
  getProjectHoursSummary,
  getProjectWithClient,
  listProjectSummaries,
  listTasksByProject,
  listVersionsByProject,
  unarchiveProject,
  updateProject,
} from "../storage/index.js"
import {
  parseOptionalClientId,
  parseProjectBudget,
  parseProjectPatch,
} from "../lib/project-input.js"
import { isProjectStatus } from "../types/index.js"
import { getParam } from "../utils/params.js"
import { requireProjectStudio, requireStudioSession } from "./route-helpers.js"

const projectsRouter = Router()

function projectForRole<T extends object>(project: T, role: UserRole): T {
  if (hasCapability(role, "business.manage")) {
    return project
  }

  const {
    budget: _budget,
    clientId: _clientId,
    notes: _notes,
    outstandingBalance: _outstandingBalance,
    servicesEstimate: _servicesEstimate,
    servicesEstimatedHours: _servicesEstimatedHours,
    servicesLoggedHours: _servicesLoggedHours,
    client,
    ...safeProject
  } = project as T & {
    budget?: unknown
    clientId?: unknown
    notes?: unknown
    outstandingBalance?: unknown
    servicesEstimate?: unknown
    servicesEstimatedHours?: unknown
    servicesLoggedHours?: unknown
    client?: { id: string; name: string; company?: string } | null
  }

  if ("client" in project) {
    return {
      ...safeProject,
      client: client
        ? { id: client.id, name: client.name, company: client.company }
        : null,
    } as T
  }

  return safeProject as T
}

function hasCommercialProjectFields(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false
  }

  return ["client", "clientId", "budget", "notes"].some((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  )
}

function parseListProjectsOptions(query: Record<string, unknown>) {
  const archived =
    typeof query.archived === "string" ? query.archived.trim() : undefined
  const includeArchived =
    typeof query.includeArchived === "string"
      ? query.includeArchived.trim()
      : undefined

  if (archived === "true") {
    return { archivedOnly: true as const }
  }

  if (includeArchived === "true") {
    return { includeArchived: true as const }
  }

  return undefined
}

projectsRouter.get("/", requireCapability("projects.view"), (req, res) => {
  const context = requireStudioSession(req, res)
  if (!context) {
    return
  }

  const clientId =
    typeof req.query.clientId === "string" ? req.query.clientId.trim() : undefined
  const listOptions = parseListProjectsOptions(req.query)

  res.json(
    listProjectSummaries(context.studioId, clientId || undefined, listOptions).map((project) =>
      projectForRole(project, context.role),
    ),
  )
})

projectsRouter.post("/", requireCapability("projects.mutate"), (req, res) => {
  const context = requireStudioSession(req, res)
  if (!context) {
    return
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  const id =
    typeof req.body?.id === "string" && req.body.id.trim()
      ? req.body.id.trim()
      : undefined

  if (!name) {
    res.status(400).json({ error: "Project name is required." })
    return
  }

  if (context.role !== "admin" && hasCommercialProjectFields(req.body)) {
    res.status(403).json({ error: "Commercial project fields require business access." })
    return
  }

  if (id && getProject(id)) {
    res.status(409).json({ error: "A project with this id already exists." })
    return
  }

  const status = req.body?.status
  if (status !== undefined && !isProjectStatus(status)) {
    res.status(400).json({
      error: "status must be one of: active, on_hold, completed.",
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

  const parsedClientId = parseOptionalClientId(req.body)
  if ("error" in parsedClientId) {
    res.status(400).json({ error: parsedClientId.error })
    return
  }

  if (parsedClientId.clientId && !getClient(parsedClientId.clientId)) {
    res.status(400).json({ error: "clientId does not match a client." })
    return
  }

  const project = createProject({
    studioId: context.studioId,
    name,
    id,
    status,
    client: typeof req.body?.client === "string" ? req.body.client.trim() : undefined,
    clientId: parsedClientId.clientId,
    description:
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : undefined,
    startDate:
      typeof req.body?.startDate === "string" ? req.body.startDate : undefined,
    endDate: typeof req.body?.endDate === "string" ? req.body.endDate : undefined,
    budget,
    notes:
      typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined,
  })
  res.status(201).json(projectForRole(project, context.role))
})

projectsRouter.post(
  "/:projectId/duplicate",
  requireCapability("projects.mutate"),
  validateProjectIdParam,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

    const duplicated = duplicateProject(projectId)

    if (!duplicated) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    res.status(201).json(duplicated)
  },
)

projectsRouter.get("/:projectId", requireCapability("projects.view"), (req, res) => {
  const projectId = getParam(req.params.projectId)
  const context = requireProjectStudio(req, res, projectId)
  if (!context) {
    return
  }

  const project = getProjectWithClient(projectId)

  if (!project) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  res.json(projectForRole(project, context.role))
})

projectsRouter.patch(
  "/:projectId",
  requireCapability("projects.mutate"),
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

    const project = getProject(projectId)

    if (!project) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    if (context.role !== "admin" && hasCommercialProjectFields(req.body)) {
      res.status(403).json({ error: "Commercial project fields require business access." })
      return
    }

    const parsed = parseProjectPatch(req.body)
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error })
      return
    }

    if (
      parsed.input.clientId !== undefined &&
      parsed.input.clientId !== null &&
      !getClient(parsed.input.clientId)
    ) {
      res.status(400).json({ error: "clientId does not match a client." })
      return
    }

    const updated = updateProject(projectId, parsed.input)
    if (!updated) {
      res.status(404).json({ error: "Project not found." })
      return
    }
    res.json(projectForRole(updated, context.role))
  },
)

projectsRouter.post(
  "/:projectId/archive",
  requireCapability("data.delete"),
  validateProjectIdParam,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

    const project = getProject(projectId)

    if (!project) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    const archived = archiveProject(projectId)
    res.json(archived)
  },
)

projectsRouter.post(
  "/:projectId/unarchive",
  requireCapability("data.delete"),
  validateProjectIdParam,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

    const project = getProject(projectId)

    if (!project) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    const restored = unarchiveProject(projectId)
    res.json(restored)
  },
)

projectsRouter.delete(
  "/:projectId",
  requireCapability("data.delete"),
  validateProjectIdParam,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

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
  requireCapability("projects.view"),
  validateProjectParams,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

    const project = getProject(projectId)

    if (!project) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    res.json(listVersionsByProject(projectId))
  },
)

projectsRouter.get(
  "/:projectId/tasks",
  requireCapability("projects.view"),
  validateProjectParams,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

    const project = getProject(projectId)

    if (!project) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    res.json(listTasksByProject(projectId))
  },
)

projectsRouter.get(
  "/:projectId/hours-summary",
  requireCapability("business.manage"),
  validateProjectParams,
  (req, res) => {
    const projectId = getParam(req.params.projectId)
    const context = requireProjectStudio(req, res, projectId)
    if (!context) {
      return
    }

    const project = getProject(projectId)

    if (!project) {
      res.status(404).json({ error: "Project not found." })
      return
    }

    res.json(getProjectHoursSummary(projectId))
  },
)

export default projectsRouter
