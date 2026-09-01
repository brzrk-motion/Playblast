import { Router } from "express"
import { requireAdminOnly } from "../middleware/authorization.js"
import {
  addProjectService,
  listProjectServices,
  removeProjectService,
  updateProjectService,
} from "../storage/index.js"
import { getParam, getProjectIdParam } from "../utils/params.js"
import { requireProjectStudio } from "./route-helpers.js"

const projectServicesRouter = Router({ mergeParams: true })

function parsePositiveNumber(
  value: unknown,
  fieldName: string,
): { value: number } | { error: string } {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return { error: `${fieldName} must be greater than 0.` }
  }

  return { value }
}

function hasAtMostOneDecimalPlace(value: number): boolean {
  return Math.round(value * 10) / 10 === value
}

function parseOverrideHours(
  value: unknown,
): { value: number | null } | { error: string } {
  if (value === null) {
    return { value: null }
  }

  if (value === undefined) {
    return { error: "overrideHours is required." }
  }

  const parsed = parsePositiveNumber(value, "overrideHours")
  if ("error" in parsed) {
    return parsed
  }

  if (!hasAtMostOneDecimalPlace(parsed.value)) {
    return { error: "overrideHours allows at most one decimal place." }
  }

  return { value: parsed.value }
}

projectServicesRouter.use(requireAdminOnly())

projectServicesRouter.get("/", (req, res) => {
  const projectId = getProjectIdParam(req)
  const context = requireProjectStudio(req, res, projectId)
  if (!context) {
    return
  }

  res.json(listProjectServices(projectId))
})

projectServicesRouter.post("/", (req, res) => {
  const projectId = getProjectIdParam(req)
  const context = requireProjectStudio(req, res, projectId)
  if (!context) {
    return
  }

  const serviceId =
    typeof req.body?.serviceId === "string" ? req.body.serviceId.trim() : ""
  if (!serviceId) {
    res.status(400).json({ error: "serviceId is required." })
    return
  }

  let quantity = 1
  if (req.body?.quantity !== undefined && req.body?.quantity !== null) {
    if (
      typeof req.body.quantity !== "number" ||
      !Number.isInteger(req.body.quantity) ||
      req.body.quantity < 1
    ) {
      res.status(400).json({
        error: "quantity must be a positive integer.",
      })
      return
    }
    quantity = req.body.quantity
  }

  const result = addProjectService(projectId, serviceId, quantity)

  if (result === "service_not_found") {
    res.status(400).json({ error: "serviceId does not match a service." })
    return
  }

  if (result === "already_linked") {
    res.status(409).json({
      error:
        "This service is already attached to the project. Each service can only be linked once; adjust quantity by removing and re-adding.",
    })
    return
  }

  res.status(201).json(result)
})

projectServicesRouter.patch("/:serviceId", (req, res) => {
  const projectId = getProjectIdParam(req)
  const serviceId = getParam(req.params.serviceId)
  const context = requireProjectStudio(req, res, projectId)
  if (!context) {
    return
  }

  const overrideHoursResult = parseOverrideHours(req.body?.overrideHours)
  if ("error" in overrideHoursResult) {
    res.status(400).json({ error: overrideHoursResult.error })
    return
  }

  const result = updateProjectService(projectId, serviceId, {
    overrideHours: overrideHoursResult.value,
  })

  if (result === "not_found") {
    res.status(404).json({ error: "Service is not attached to this project." })
    return
  }

  res.json(result)
})

projectServicesRouter.delete("/:serviceId", (req, res) => {
  const projectId = getProjectIdParam(req)
  const serviceId = getParam(req.params.serviceId)
  const context = requireProjectStudio(req, res, projectId)
  if (!context) {
    return
  }

  const result = removeProjectService(projectId, serviceId)

  if (result === "not_found") {
    res.status(404).json({ error: "Service is not attached to this project." })
    return
  }

  res.status(204).send()
})

export default projectServicesRouter
