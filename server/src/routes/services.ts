import { Router } from "express"
import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from "../storage/index.js"
import { isServiceType } from "../types/index.js"
import { getParam } from "../utils/params.js"

function getServiceIdParam(req: { params: { id?: string | string[] } }): string {
  return getParam(req.params.id ?? "")
}

function parseRequiredNumber(
  value: unknown,
  fieldName: string,
): { value: number } | { error: string } {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { error: `${fieldName} must be a non-negative number.` }
  }

  return { value }
}

const servicesRouter = Router()

servicesRouter.get("/", (_req, res) => {
  res.json(listServices())
})

servicesRouter.post("/", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    res.status(400).json({ error: "Service name is required." })
    return
  }

  const hourEstimateResult = parseRequiredNumber(
    req.body?.hourEstimate,
    "hourEstimate",
  )
  if ("error" in hourEstimateResult) {
    res.status(400).json({ error: hourEstimateResult.error })
    return
  }

  const hourlyRateResult = parseRequiredNumber(req.body?.hourlyRate, "hourlyRate")
  if ("error" in hourlyRateResult) {
    res.status(400).json({ error: hourlyRateResult.error })
    return
  }

  if (!isServiceType(req.body?.type)) {
    res.status(400).json({ error: "type must be 'static' or 'animated'." })
    return
  }

  const service = createService({
    name,
    hourEstimate: hourEstimateResult.value,
    hourlyRate: hourlyRateResult.value,
    type: req.body.type,
  })

  res.status(201).json(service)
})

servicesRouter.put("/:id", (req, res) => {
  const serviceId = getServiceIdParam(req)
  const existing = getService(serviceId)

  if (!existing) {
    res.status(404).json({ error: "Service not found." })
    return
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    res.status(400).json({ error: "Service name is required." })
    return
  }

  const hourEstimateResult = parseRequiredNumber(
    req.body?.hourEstimate,
    "hourEstimate",
  )
  if ("error" in hourEstimateResult) {
    res.status(400).json({ error: hourEstimateResult.error })
    return
  }

  const hourlyRateResult = parseRequiredNumber(req.body?.hourlyRate, "hourlyRate")
  if ("error" in hourlyRateResult) {
    res.status(400).json({ error: hourlyRateResult.error })
    return
  }

  if (!isServiceType(req.body?.type)) {
    res.status(400).json({ error: "type must be 'static' or 'animated'." })
    return
  }

  const updated = updateService(serviceId, {
    name,
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
