import { Router } from "express"
import { requireAdminOnly } from "../middleware/authorization.js"
import {
  clampRetainerCycleDay,
  getCurrentCycleStart,
} from "../lib/retainer-cycle.js"
import {
  createClient,
  deleteClient,
  getClient,
  getClientWithProjects,
  getLead,
  listClients,
  revertClientToLead,
  updateClient,
  upsertRetainerCycleHours,
} from "../storage/index.js"
import type { UpdateClientInput } from "../types/index.js"
import { getParam } from "../utils/params.js"
import { requireClientStudio, requireStudioSession } from "./route-helpers.js"

function getClientIdParam(req: { params: { id?: string | string[] } }): string {
  return getParam(req.params.id ?? "")
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  return undefined
}

function validateRetainerFields(input: {
  isRetainer?: boolean
  retainerHours?: number | null
  retainerRate?: number | null
  retainerCycleDay?: number | null
}): string | null {
  if (!input.isRetainer) {
    return null
  }

  if (input.retainerHours == null || input.retainerHours <= 0) {
    return "retainerHours must be a positive number for retainer clients."
  }

  if (input.retainerRate == null || input.retainerRate < 0) {
    return "retainerRate must be zero or greater for retainer clients."
  }

  if (input.retainerCycleDay == null) {
    return "retainerCycleDay is required for retainer clients."
  }

  const cycleDay = Math.trunc(input.retainerCycleDay)
  if (cycleDay < 1 || cycleDay > 28) {
    return "retainerCycleDay must be between 1 and 28."
  }

  return null
}

function applyRetainerInput(
  input: UpdateClientInput,
  body: Record<string, unknown>,
  existing?: { isRetainer?: boolean; retainerHours?: number; retainerRate?: number; retainerCycleDay?: number },
): string | null {
  if (body.isRetainer !== undefined) {
    if (typeof body.isRetainer !== "boolean") {
      return "isRetainer must be a boolean."
    }
    input.isRetainer = body.isRetainer
  }

  const retainerHours = parseOptionalNumber(body.retainerHours)
  if (retainerHours === undefined && body.retainerHours !== undefined) {
    return "retainerHours must be a number or null."
  }
  if (retainerHours !== undefined) {
    input.retainerHours = retainerHours
  }

  const retainerRate = parseOptionalNumber(body.retainerRate)
  if (retainerRate === undefined && body.retainerRate !== undefined) {
    return "retainerRate must be a number or null."
  }
  if (retainerRate !== undefined) {
    input.retainerRate = retainerRate
  }

  if (body.retainerCycleDay !== undefined) {
    if (body.retainerCycleDay === null) {
      input.retainerCycleDay = null
    } else if (
      typeof body.retainerCycleDay === "number" &&
      Number.isFinite(body.retainerCycleDay)
    ) {
      input.retainerCycleDay = clampRetainerCycleDay(body.retainerCycleDay)
    } else {
      return "retainerCycleDay must be a number or null."
    }
  }

  const merged = {
    isRetainer: input.isRetainer ?? existing?.isRetainer ?? false,
    retainerHours:
      input.retainerHours !== undefined
        ? input.retainerHours
        : existing?.retainerHours ?? null,
    retainerRate:
      input.retainerRate !== undefined
        ? input.retainerRate
        : existing?.retainerRate ?? null,
    retainerCycleDay:
      input.retainerCycleDay !== undefined
        ? input.retainerCycleDay
        : existing?.retainerCycleDay ?? null,
  }

  return validateRetainerFields(merged)
}

const clientsRouter = Router()

clientsRouter.use(requireAdminOnly())

clientsRouter.get("/", (req, res) => {
  const context = requireStudioSession(req, res)
  if (!context) {
    return
  }

  res.json(listClients(context.studioId))
})

clientsRouter.post("/", (req, res) => {
  const context = requireStudioSession(req, res)
  if (!context) {
    return
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    res.status(400).json({ error: "Client name is required." })
    return
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim() : ""
  if (!email) {
    res.status(400).json({ error: "Client email is required." })
    return
  }

  const convertedFromLeadId =
    typeof req.body?.convertedFromLeadId === "string"
      ? req.body.convertedFromLeadId.trim()
      : undefined

  if (convertedFromLeadId && !getLead(convertedFromLeadId)) {
    res.status(400).json({ error: "convertedFromLeadId does not match a lead." })
    return
  }

  const retainerInput: UpdateClientInput = {}
  const retainerError = applyRetainerInput(retainerInput, req.body ?? {})
  if (retainerError) {
    res.status(400).json({ error: retainerError })
    return
  }

  const client = createClient({
    studioId: context.studioId,
    name,
    email,
    company:
      typeof req.body?.company === "string" ? req.body.company.trim() : undefined,
    phone: typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined,
    website:
      typeof req.body?.website === "string" ? req.body.website.trim() : undefined,
    notes: typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined,
    convertedFromLeadId,
    ...(retainerInput.isRetainer
      ? {
          isRetainer: true,
          retainerHours: retainerInput.retainerHours ?? undefined,
          retainerRate: retainerInput.retainerRate ?? undefined,
          retainerCycleDay: retainerInput.retainerCycleDay ?? undefined,
        }
      : {}),
  })

  res.status(201).json(client)
})

clientsRouter.get("/:id", (req, res) => {
  const clientId = getClientIdParam(req)
  const context = requireClientStudio(req, res, clientId)
  if (!context) {
    return
  }

  const client = getClientWithProjects(clientId, context.studioId)

  if (!client) {
    res.status(404).json({ error: "Client not found." })
    return
  }

  res.json(client)
})

clientsRouter.patch("/:id", (req, res) => {
  const clientId = getClientIdParam(req)
  const context = requireClientStudio(req, res, clientId)
  if (!context) {
    return
  }

  const existing = getClient(clientId)

  if (!existing) {
    res.status(404).json({ error: "Client not found." })
    return
  }

  const input: UpdateClientInput = {}

  if (req.body?.name !== undefined) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      res.status(400).json({ error: "name must be a non-empty string." })
      return
    }
    input.name = req.body.name.trim()
  }

  if (req.body?.email !== undefined) {
    if (typeof req.body.email !== "string" || !req.body.email.trim()) {
      res.status(400).json({ error: "email must be a non-empty string." })
      return
    }
    input.email = req.body.email.trim()
  }

  if (req.body?.company !== undefined) {
    input.company =
      typeof req.body.company === "string" ? req.body.company.trim() || null : null
  }

  if (req.body?.phone !== undefined) {
    input.phone =
      typeof req.body.phone === "string" ? req.body.phone.trim() || null : null
  }

  if (req.body?.website !== undefined) {
    input.website =
      typeof req.body.website === "string" ? req.body.website.trim() || null : null
  }

  if (req.body?.notes !== undefined) {
    input.notes =
      typeof req.body.notes === "string" ? req.body.notes.trim() || null : null
  }

  if (req.body?.convertedFromLeadId !== undefined) {
    const leadId =
      typeof req.body.convertedFromLeadId === "string"
        ? req.body.convertedFromLeadId.trim() || null
        : null

    if (leadId && !getLead(leadId)) {
      res.status(400).json({ error: "convertedFromLeadId does not match a lead." })
      return
    }

    input.convertedFromLeadId = leadId
  }

  const retainerError = applyRetainerInput(input, req.body ?? {}, existing)
  if (retainerError) {
    res.status(400).json({ error: retainerError })
    return
  }

  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "No valid fields to update." })
    return
  }

  const updated = updateClient(clientId, input)
  res.json(updated)
})

clientsRouter.patch("/:id/retainer-hours", (req, res) => {
  const clientId = getClientIdParam(req)
  const context = requireClientStudio(req, res, clientId)
  if (!context) {
    return
  }

  const existing = getClient(clientId)

  if (!existing) {
    res.status(404).json({ error: "Client not found." })
    return
  }

  if (
    !existing.isRetainer ||
    existing.retainerCycleDay == null ||
    existing.retainerHours == null ||
    existing.retainerRate == null
  ) {
    res.status(400).json({ error: "Client is not configured as a retainer client." })
    return
  }

  const hoursLogged = parseOptionalNumber(req.body?.hoursLogged)
  if (hoursLogged === undefined || hoursLogged === null || hoursLogged < 0) {
    res.status(400).json({ error: "hoursLogged must be a non-negative number." })
    return
  }

  const cycleStart = getCurrentCycleStart(existing.retainerCycleDay)
  upsertRetainerCycleHours(clientId, cycleStart, hoursLogged)

  const client = getClientWithProjects(clientId, context.studioId)
  res.json(client)
})

clientsRouter.post("/:id/revert-to-lead", (req, res) => {
  const clientId = getClientIdParam(req)
  const context = requireClientStudio(req, res, clientId)
  if (!context) {
    return
  }

  const result = revertClientToLead(clientId)

  if (result === "not_found") {
    res.status(404).json({ error: "Client not found." })
    return
  }

  if (result === "has_active_projects") {
    res.status(409).json({
      error:
        "Client cannot be reverted to a lead while linked to active projects. Archive or unlink those projects first.",
    })
    return
  }

  res.status(201).json(result)
})

clientsRouter.delete("/:id", (req, res) => {
  const clientId = getClientIdParam(req)
  const context = requireClientStudio(req, res, clientId)
  if (!context) {
    return
  }

  const result = deleteClient(clientId)

  if (result === "not_found") {
    res.status(404).json({ error: "Client not found." })
    return
  }

  if (result === "has_active_projects") {
    res.status(409).json({
      error:
        "Client cannot be deleted while linked to active projects. Archive or unlink those projects first.",
    })
    return
  }

  res.status(204).send()
})

export default clientsRouter
