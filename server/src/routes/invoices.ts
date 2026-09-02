import { Router, type Response } from "express"
import { requireAdminOnly } from "../middleware/authorization.js"
import { generateInvoicePdf } from "../lib/invoice-pdf.js"
import {
  createInvoice,
  createInvoicePayment,
  getInvoice,
  getInvoiceWithPayments,
  listInvoicePayments,
  listInvoicesByProject,
  updateInvoice,
} from "../storage/index.js"
import { getParam, getProjectIdParam } from "../utils/params.js"
import { requireInvoiceStudio, requireProjectStudio } from "./route-helpers.js"

const projectInvoicesRouter = Router({ mergeParams: true })

function parsePositiveNumber(
  value: unknown,
  fieldName: string,
): { value: number } | { error: string } {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return { error: `${fieldName} must be greater than 0.` }
  }

  return { value }
}

function parseIsoDate(
  value: unknown,
  fieldName: string,
): { value: string } | { error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { error: `${fieldName} is required.` }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { error: `${fieldName} must be a valid date.` }
  }

  return { value: value.trim() }
}

projectInvoicesRouter.use(requireAdminOnly())

projectInvoicesRouter.get("/", (req, res) => {
  const projectId = getProjectIdParam(req)
  const context = requireProjectStudio(req, res, projectId)
  if (!context) {
    return
  }

  res.json(listInvoicesByProject(projectId))
})

projectInvoicesRouter.post("/", (req, res) => {
  const projectId = getProjectIdParam(req)
  const context = requireProjectStudio(req, res, projectId)
  if (!context) {
    return
  }

  const result = createInvoice(projectId)

  if (result === "project_not_found") {
    res.status(404).json({ error: "Project not found." })
    return
  }

  if (result === "no_client") {
    res.status(400).json({
      error: "Link a client to this project before generating an invoice.",
    })
    return
  }

  if (result === "no_services") {
    res.status(400).json({
      error: "Add at least one service to the project before generating an invoice.",
    })
    return
  }

  res.status(201).json(result)
})

const invoiceByIdRouter = Router()

invoiceByIdRouter.use(requireAdminOnly())

invoiceByIdRouter.get("/:invoiceId", (req, res) => {
  const invoiceId = getParam(req.params.invoiceId)
  const context = requireInvoiceStudio(req, res, invoiceId)
  if (!context) {
    return
  }

  const invoice = getInvoiceWithPayments(invoiceId)

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found." })
    return
  }

  res.json(invoice)
})

invoiceByIdRouter.patch("/:invoiceId", (req, res) => {
  const invoiceId = getParam(req.params.invoiceId)
  const context = requireInvoiceStudio(req, res, invoiceId)
  if (!context) {
    return
  }

  const existing = getInvoice(invoiceId)

  if (!existing) {
    res.status(404).json({ error: "Invoice not found." })
    return
  }

  const updates: { dueDate?: string } = {}

  if (req.body?.dueDate !== undefined) {
    const dueDateResult = parseIsoDate(req.body.dueDate, "dueDate")
    if ("error" in dueDateResult) {
      res.status(400).json({ error: dueDateResult.error })
      return
    }
    updates.dueDate = dueDateResult.value
  }

  const invoice = updateInvoice(invoiceId, updates)
  res.json(invoice)
})

invoiceByIdRouter.get("/:invoiceId/payments", (req, res) => {
  const invoiceId = getParam(req.params.invoiceId)
  const context = requireInvoiceStudio(req, res, invoiceId)
  if (!context) {
    return
  }

  res.json(listInvoicePayments(invoiceId))
})

invoiceByIdRouter.post("/:invoiceId/payments", (req, res) => {
  const invoiceId = getParam(req.params.invoiceId)
  const context = requireInvoiceStudio(req, res, invoiceId)
  if (!context) {
    return
  }

  const amountResult = parsePositiveNumber(req.body?.amount, "amount")
  if ("error" in amountResult) {
    res.status(400).json({ error: amountResult.error })
    return
  }

  const paidAtResult = parseIsoDate(req.body?.paidAt, "paidAt")
  if ("error" in paidAtResult) {
    res.status(400).json({ error: paidAtResult.error })
    return
  }

  const notes =
    typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined

  const result = createInvoicePayment({
    invoiceId,
    amount: amountResult.value,
    paidAt: paidAtResult.value,
    ...(notes ? { notes } : {}),
  })

  if (result === "invoice_not_found") {
    res.status(404).json({ error: "Invoice not found." })
    return
  }

  const invoice = getInvoiceWithPayments(invoiceId)
  res.status(201).json({ payment: result, invoice })
})

async function sendInvoicePdf(res: Response, invoiceId: string): Promise<void> {
  const invoice = getInvoice(invoiceId)

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found." })
    return
  }

  try {
    const pdf = await generateInvoicePdf(invoice)
    const filename = `invoice-${invoice.invoiceNumber}.pdf`

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(pdf)
  } catch {
    res.status(500).json({ error: "Failed to generate invoice PDF." })
  }
}

invoiceByIdRouter.get("/:invoiceId/pdf", async (req, res) => {
  const invoiceId = getParam(req.params.invoiceId)
  const context = requireInvoiceStudio(req, res, invoiceId)
  if (!context) {
    return
  }

  await sendInvoicePdf(res, invoiceId)
})

invoiceByIdRouter.get("/:invoiceId/download", async (req, res) => {
  const invoiceId = getParam(req.params.invoiceId)
  const context = requireInvoiceStudio(req, res, invoiceId)
  if (!context) {
    return
  }

  await sendInvoicePdf(res, invoiceId)
})

export { invoiceByIdRouter }
export default projectInvoicesRouter
