import { Router } from "express"
import {
  createInvoice,
  createInvoicePayment,
  getInvoiceWithPayments,
  getProject,
  listInvoicesByProject,
  updateInvoice,
} from "../storage/index.js"
import { addDaysToIsoDate } from "../lib/invoice.js"
import { getParam, getProjectIdParam } from "../utils/params.js"

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

function parseDueDate(
  body: Record<string, unknown>,
  issuedAt: string,
): { value: string } | { error: string } {
  if (body.dueDate !== undefined) {
    return parseIsoDate(body.dueDate, "dueDate")
  }

  if (body.netDays !== undefined) {
    if (
      typeof body.netDays !== "number" ||
      !Number.isInteger(body.netDays) ||
      body.netDays < 0
    ) {
      return { error: "netDays must be a non-negative integer." }
    }

    return { value: addDaysToIsoDate(issuedAt, body.netDays) }
  }

  return { error: "dueDate or netDays is required." }
}

projectInvoicesRouter.get("/", (req, res) => {
  const projectId = getProjectIdParam(req)

  if (!getProject(projectId)) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  res.json(listInvoicesByProject(projectId))
})

projectInvoicesRouter.post("/", (req, res) => {
  const projectId = getProjectIdParam(req)

  if (!getProject(projectId)) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  const invoiceNumber =
    typeof req.body?.invoiceNumber === "string"
      ? req.body.invoiceNumber.trim()
      : ""
  if (!invoiceNumber) {
    res.status(400).json({ error: "invoiceNumber is required." })
    return
  }

  const issuedAtResult = parseIsoDate(req.body?.issuedAt, "issuedAt")
  if ("error" in issuedAtResult) {
    res.status(400).json({ error: issuedAtResult.error })
    return
  }

  const dueDateResult = parseDueDate(req.body ?? {}, issuedAtResult.value)
  if ("error" in dueDateResult) {
    res.status(400).json({ error: dueDateResult.error })
    return
  }

  const totalResult = parsePositiveNumber(req.body?.total, "total")
  if ("error" in totalResult) {
    res.status(400).json({ error: totalResult.error })
    return
  }

  const invoice = createInvoice({
    projectId,
    invoiceNumber,
    issuedAt: issuedAtResult.value,
    dueDate: dueDateResult.value,
    total: totalResult.value,
  })

  res.status(201).json(invoice)
})

const invoicesRouter = Router()

invoicesRouter.get("/:id", (req, res) => {
  const id = getParam(req.params.id)
  const invoice = getInvoiceWithPayments(id)

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found." })
    return
  }

  res.json(invoice)
})

invoicesRouter.patch("/:id", (req, res) => {
  const id = getParam(req.params.id)
  const existing = getInvoiceWithPayments(id)

  if (!existing) {
    res.status(404).json({ error: "Invoice not found." })
    return
  }

  const updates: {
    invoiceNumber?: string
    issuedAt?: string
    dueDate?: string
    total?: number
  } = {}

  if (req.body?.invoiceNumber !== undefined) {
    const invoiceNumber =
      typeof req.body.invoiceNumber === "string"
        ? req.body.invoiceNumber.trim()
        : ""
    if (!invoiceNumber) {
      res.status(400).json({ error: "invoiceNumber cannot be empty." })
      return
    }
    updates.invoiceNumber = invoiceNumber
  }

  if (req.body?.issuedAt !== undefined) {
    const issuedAtResult = parseIsoDate(req.body.issuedAt, "issuedAt")
    if ("error" in issuedAtResult) {
      res.status(400).json({ error: issuedAtResult.error })
      return
    }
    updates.issuedAt = issuedAtResult.value
  }

  if (req.body?.dueDate !== undefined) {
    const dueDateResult = parseIsoDate(req.body.dueDate, "dueDate")
    if ("error" in dueDateResult) {
      res.status(400).json({ error: dueDateResult.error })
      return
    }
    updates.dueDate = dueDateResult.value
  }

  if (req.body?.total !== undefined) {
    const totalResult = parsePositiveNumber(req.body.total, "total")
    if ("error" in totalResult) {
      res.status(400).json({ error: totalResult.error })
      return
    }
    updates.total = totalResult.value
  }

  const invoice = updateInvoice(id, updates)
  res.json(invoice)
})

invoicesRouter.post("/:id/payments", (req, res) => {
  const id = getParam(req.params.id)

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
    invoiceId: id,
    amount: amountResult.value,
    paidAt: paidAtResult.value,
    ...(notes ? { notes } : {}),
  })

  if (result === "invoice_not_found") {
    res.status(404).json({ error: "Invoice not found." })
    return
  }

  const invoice = getInvoiceWithPayments(id)
  res.status(201).json({ payment: result, invoice })
})

export { invoicesRouter }
export default projectInvoicesRouter
