import { Router } from "express"
import {
  createContactLog,
  createLead,
  deleteContactLog,
  deleteLead,
  getContactLog,
  getLead,
  getLeadWithContactLog,
  listContactLog,
  listLeads,
  updateLead,
} from "../storage/index.js"
import type { LeadStatus, UpdateLeadInput } from "../types/index.js"
import {
  contactLogTypeIndicatesResponse,
  isContactLogType,
  isLeadStatus,
} from "../types/index.js"
import { getParam } from "../utils/params.js"

function getLeadIdParam(req: { params: { id?: string | string[] } }): string {
  return getParam(req.params.id ?? "")
}

function parseRepliedFilter(
  value: unknown,
): { replied: boolean } | { error: string } | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === "true") {
    return { replied: true }
  }

  if (value === "false") {
    return { replied: false }
  }

  return { error: "replied must be true or false." }
}

const leadsRouter = Router()

leadsRouter.get("/", (req, res) => {
  const filters: { status?: LeadStatus; replied?: boolean } = {}

  if (req.query.status !== undefined) {
    if (!isLeadStatus(req.query.status)) {
      res.status(400).json({
        error:
          "status must be one of: new, contacted, replied, negotiating, converted, lost.",
      })
      return
    }
    filters.status = req.query.status
  }

  const repliedFilter = parseRepliedFilter(req.query.replied)
  if (repliedFilter && "error" in repliedFilter) {
    res.status(400).json({ error: repliedFilter.error })
    return
  }
  if (repliedFilter) {
    filters.replied = repliedFilter.replied
  }

  res.json(listLeads(filters))
})

leadsRouter.post("/", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    res.status(400).json({ error: "Lead name is required." })
    return
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim() : ""
  if (!email) {
    res.status(400).json({ error: "Lead email is required." })
    return
  }

  if (req.body?.status !== undefined && !isLeadStatus(req.body.status)) {
    res.status(400).json({
      error:
        "status must be one of: new, contacted, replied, negotiating, converted, lost.",
    })
    return
  }

  if (req.body?.replied !== undefined && typeof req.body.replied !== "boolean") {
    res.status(400).json({ error: "replied must be a boolean." })
    return
  }

  const lead = createLead({
    name,
    email,
    status: req.body?.status,
    replied: req.body?.replied,
    company:
      typeof req.body?.company === "string" ? req.body.company.trim() : undefined,
    phone: typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined,
    source:
      typeof req.body?.source === "string" ? req.body.source.trim() : undefined,
    notes: typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined,
    lastContactedAt:
      typeof req.body?.lastContactedAt === "string"
        ? req.body.lastContactedAt
        : undefined,
  })

  res.status(201).json(lead)
})

leadsRouter.get("/:id/log", (req, res) => {
  const leadId = getLeadIdParam(req)

  if (!getLead(leadId)) {
    res.status(404).json({ error: "Lead not found." })
    return
  }

  res.json(listContactLog(leadId))
})

leadsRouter.post("/:id/log", (req, res) => {
  const leadId = getLeadIdParam(req)

  if (!getLead(leadId)) {
    res.status(404).json({ error: "Lead not found." })
    return
  }

  if (!isContactLogType(req.body?.type)) {
    res.status(400).json({
      error: "type must be one of: email, call, meeting, note.",
    })
    return
  }

  const contactedAt =
    typeof req.body?.contactedAt === "string" ? req.body.contactedAt.trim() : ""
  if (!contactedAt) {
    res.status(400).json({ error: "contactedAt is required." })
    return
  }

  if (
    req.body?.indicatesResponse !== undefined &&
    typeof req.body.indicatesResponse !== "boolean"
  ) {
    res.status(400).json({ error: "indicatesResponse must be a boolean." })
    return
  }

  const entry = createContactLog({
    leadId,
    type: req.body.type,
    contactedAt,
    notes:
      typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined,
    indicatesResponse:
      req.body?.indicatesResponse === true ||
      contactLogTypeIndicatesResponse(req.body.type),
  })

  res.status(201).json(entry)
})

leadsRouter.delete("/:id/log/:logId", (req, res) => {
  const leadId = getLeadIdParam(req)
  const logId = getParam(req.params.logId)

  if (!getLead(leadId)) {
    res.status(404).json({ error: "Lead not found." })
    return
  }

  const entry = getContactLog(logId)
  if (!entry || entry.leadId !== leadId) {
    res.status(404).json({ error: "Contact log entry not found." })
    return
  }

  deleteContactLog(logId)
  res.status(204).send()
})

leadsRouter.get("/:id", (req, res) => {
  const leadId = getLeadIdParam(req)
  const lead = getLeadWithContactLog(leadId)

  if (!lead) {
    res.status(404).json({ error: "Lead not found." })
    return
  }

  res.json(lead)
})

leadsRouter.patch("/:id", (req, res) => {
  const leadId = getLeadIdParam(req)
  const existing = getLead(leadId)

  if (!existing) {
    res.status(404).json({ error: "Lead not found." })
    return
  }

  const input: UpdateLeadInput = {}

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

  if (req.body?.status !== undefined) {
    if (!isLeadStatus(req.body.status)) {
      res.status(400).json({
        error:
          "status must be one of: new, contacted, replied, negotiating, converted, lost.",
      })
      return
    }
    input.status = req.body.status
  }

  if (req.body?.replied !== undefined) {
    if (typeof req.body.replied !== "boolean") {
      res.status(400).json({ error: "replied must be a boolean." })
      return
    }
    input.replied = req.body.replied
  }

  if (req.body?.company !== undefined) {
    input.company =
      typeof req.body.company === "string" ? req.body.company.trim() || null : null
  }

  if (req.body?.phone !== undefined) {
    input.phone =
      typeof req.body.phone === "string" ? req.body.phone.trim() || null : null
  }

  if (req.body?.source !== undefined) {
    input.source =
      typeof req.body.source === "string" ? req.body.source.trim() || null : null
  }

  if (req.body?.notes !== undefined) {
    input.notes =
      typeof req.body.notes === "string" ? req.body.notes.trim() || null : null
  }

  if (req.body?.lastContactedAt !== undefined) {
    input.lastContactedAt =
      typeof req.body.lastContactedAt === "string" && req.body.lastContactedAt
        ? req.body.lastContactedAt
        : null
  }

  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "No valid fields to update." })
    return
  }

  const updated = updateLead(leadId, input)
  res.json(updated)
})

leadsRouter.delete("/:id", (req, res) => {
  const leadId = getLeadIdParam(req)
  const deleted = deleteLead(leadId)

  if (!deleted) {
    res.status(404).json({ error: "Lead not found." })
    return
  }

  res.status(204).send()
})

export default leadsRouter
