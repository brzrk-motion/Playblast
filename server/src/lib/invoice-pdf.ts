import PDFDocument from "pdfkit"
import type { Invoice } from "../types/invoice.js"

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

export function generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right
    const contentWidth = right - left

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("INVOICE", left, 50)

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice #${invoice.invoiceNumber}`, left, 80)
      .text(`Date: ${formatDate(invoice.invoiceDate)}`, left, 95)

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Bill To", left, 140)

    doc.font("Helvetica").fontSize(10)
    let billToY = 155
    doc.text(invoice.clientName, left, billToY)
    billToY += 14

    if (invoice.clientCompany) {
      doc.text(invoice.clientCompany, left, billToY)
      billToY += 14
    }

    doc.text(invoice.clientEmail, left, billToY)

    doc
      .font("Helvetica-Bold")
      .text("Project", 300, 140)
      .font("Helvetica")
      .text(invoice.projectName, 300, 155, { width: 200 })

    const tableTop = 220
    const colService = left
    const colHours = left + contentWidth * 0.5
    const colRate = left + contentWidth * 0.65
    const colTotal = left + contentWidth * 0.8

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Service", colService, tableTop)
      .text("Hours", colHours, tableTop, { width: 60, align: "right" })
      .text("Rate", colRate, tableTop, { width: 70, align: "right" })
      .text("Total", colTotal, tableTop, { width: 80, align: "right" })

    doc
      .moveTo(left, tableTop + 16)
      .lineTo(right, tableTop + 16)
      .strokeColor("#cccccc")
      .stroke()

    let rowY = tableTop + 28
    doc.font("Helvetica").fontSize(10)

    for (const line of invoice.lineItems) {
      doc.text(line.serviceName, colService, rowY, { width: colHours - colService - 10 })
      doc.text(formatHours(line.hours), colHours, rowY, {
        width: 60,
        align: "right",
      })
      doc.text(
        `${formatCurrency(line.hourlyRate, invoice.currency)}/hr`,
        colRate,
        rowY,
        { width: 70, align: "right" },
      )
      doc.text(formatCurrency(line.lineTotal, invoice.currency), colTotal, rowY, {
        width: 80,
        align: "right",
      })
      rowY += 22
    }

    doc
      .moveTo(left, rowY + 4)
      .lineTo(right, rowY + 4)
      .strokeColor("#cccccc")
      .stroke()

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Grand Total", colRate, rowY + 16, { width: 70, align: "right" })
      .text(formatCurrency(invoice.grandTotal, invoice.currency), colTotal, rowY + 16, {
        width: 80,
        align: "right",
      })

    doc.end()
  })
}
