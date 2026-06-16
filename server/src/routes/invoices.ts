import { Router } from "express"
import { generateInvoicePdf } from "../lib/invoice-pdf.js"
import {
  createInvoice,
  getInvoice,
  getProject,
  listInvoicesByProject,
} from "../storage/index.js"
import { getParam, getProjectIdParam } from "../utils/params.js"

const projectInvoicesRouter = Router({ mergeParams: true })

projectInvoicesRouter.get("/", (req, res) => {
  const projectId = getProjectIdParam(req)

  if (!getProject(projectId)) {
    res.status(404).json({ error: "Project not found." })
    return
  }

  res.json(listInvoicesByProject(projectId))
})

projectInvoicesRouter.post("/", async (req, res) => {
  const projectId = getProjectIdParam(req)
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

invoiceByIdRouter.get("/:invoiceId/pdf", async (req, res) => {
  const invoiceId = getParam(req.params.invoiceId)
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
})

export { invoiceByIdRouter }
export default projectInvoicesRouter
