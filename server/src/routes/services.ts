import { Router } from "express"
import {
  createService,
  deleteService,
  getService,
  getServiceProjectUsage,
  listServices,
  updateService,
} from "../storage/index.js"
import { isServiceType } from "../types/index.js"
import { getParam } from "../utils/params.js"

const MAX_NAME_LENGTH = 100

function getServiceIdParam(req: { params: { id?: string | string[] } }): string {
  return getParam(req.params.id ?? "")
}

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

function validateServiceName(name: unknown): { value: string } | { error: string } {
  if (typeof name !== "string") {
    return { error: "Service name is required." }
  }

  const trimmed = name.trim()
  if (!trimmed) {
    return { error: "Service name is required." }
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      error: `Service name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    }
  }

  return { value: trimmed }
}

const servicesRouter = Router()

servicesRouter.get("/", (_req, res) => {
  res.json(listServices())
})

servicesRouter.post("/", (req, res) => {
  const nameResult = validateServiceName(req.body?.name)
  if ("error" in nameResult) {
    res.status(400).json({ error: nameResult.error })
    return
  }

  const hourEstimateResult = parsePositiveNumber(
    req.body?.hourEstimate,
    "hourEstimate",
  )
  if ("error" in hourEstimateResult) {
    res.status(400).json({ error: hourEstimateResult.error })
    return
  }

  if (!hasAtMostOneDecimalPlace(hourEstimateResult.value)) {
    res.status(400).json({
      error: "hourEstimate allows at most one decimal place.",
    })
    return
  }

  const hourlyRateResult = parsePositiveNumber(req.body?.hourlyRate, "hourlyRate")
  if ("error" in hourlyRateResult) {
    res.status(400).json({ error: hourlyRateResult.error })
    return
  }

  if (!isServiceType(req.body?.type)) {
    res.status(400).json({ error: "type must be 'static' or 'animated'." })
    return
  }

  const service = createService({
    name: nameResult.value,
    hourEstimate: hourEstimateResult.value,
    hourlyRate: hourlyRateResult.value,
    type: req.body.type,
  })

  res.status(201).json(service)
})

servicesRouter.get("/:id/usage", (req, res) => {
  const serviceId = getServiceIdParam(req)
  const usage = getServiceProjectUsage(serviceId)

  if (!usage) {
    res.status(404).json({ error: "Service not found." })
    return
  }

  res.json(usage)
})

servicesRouter.put("/:id", (req, res) => {
  const serviceId = getServiceIdParam(req)
  const existing = getService(serviceId)

  if (!existing) {
    res.status(404).json({ error: "Service not found." })
    return
  }

  const nameResult = validateServiceName(req.body?.name)
  if ("error" in nameResult) {
    res.status(400).json({ error: nameResult.error })
    return
  }

  const hourEstimateResult = parsePositiveNumber(
    req.body?.hourEstimate,
    "hourEstimate",
  )
  if ("error" in hourEstimateResult) {
    res.status(400).json({ error: hourEstimateResult.error })
    return
  }

  if (!hasAtMostOneDecimalPlace(hourEstimateResult.value)) {
    res.status(400).json({
      error: "hourEstimate allows at most one decimal place.",
    })
    return
  }

  const hourlyRateResult = parsePositiveNumber(req.body?.hourlyRate, "hourlyRate")
  if ("error" in hourlyRateResult) {
    res.status(400).json({ error: hourlyRateResult.error })
    return
  }

  if (!isServiceType(req.body?.type)) {
    res.status(400).json({ error: "type must be 'static' or 'animated'." })
    return
  }

  const updated = updateService(serviceId, {
    name: nameResult.value,
    hourEstimate: hourEstimateResult.value,
    hourlyRate: hourlyRateResult.value,
    type: req.body.type,
  })

  res.json(updated)
})

servicesRouter.delete("/:id", (req, res) => {
  const serviceId = getServiceIdParam(req)
  const result = deleteService(serviceId)

  if (result === "not_found") {
    res.status(404).json({ error: "Service not found." })
    return
  }

  res.status(204).send()
})

export default servicesRouter
