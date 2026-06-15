import { Router } from "express"
import {
  createClient,
  deleteClient,
  getClient,
  getClientWithProjects,
  getLead,
  listClients,
  revertClientToLead,
  updateClient,
} from "../storage/index.js"
import type { UpdateClientInput } from "../types/index.js"
import { getParam } from "../utils/params.js"

function getClientIdParam(req: { params: { id?: string | string[] } }): string {
  return getParam(req.params.id ?? "")
}

const clientsRouter = Router()

clientsRouter.get("/", (_req, res) => {
  res.json(listClients())
})

clientsRouter.post("/", (req, res) => {
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

  const client = createClient({
    name,
    email,
    company:
      typeof req.body?.company === "string" ? req.body.company.trim() : undefined,
    phone: typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined,
    website:
      typeof req.body?.website === "string" ? req.body.website.trim() : undefined,
    notes: typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined,
    convertedFromLeadId,
  })

  res.status(201).json(client)
})

clientsRouter.get("/:id", (req, res) => {
  const clientId = getClientIdParam(req)
  const client = getClientWithProjects(clientId)

  if (!client) {
    res.status(404).json({ error: "Client not found." })
    return
  }

  res.json(client)
})

clientsRouter.patch("/:id", (req, res) => {
  const clientId = getClientIdParam(req)
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

  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "No valid fields to update." })
    return
  }

  const updated = updateClient(clientId, input)
  res.json(updated)
})

clientsRouter.post("/:id/revert-to-lead", (req, res) => {
  const clientId = getClientIdParam(req)
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
