import type { InvoiceStatus } from "../types/invoice.js"

export function computeInvoiceStatus(
  total: number,
  amountPaid: number,
): InvoiceStatus {
  if (amountPaid <= 0) {
    return "unpaid"
  }

  if (amountPaid >= total) {
    return "paid"
  }

  return "partially_paid"
}

export function computeOutstandingBalance(
  total: number,
  amountPaid: number,
): number {
  return Math.max(0, total - amountPaid)
}

export function isInvoiceOverdue(
  dueDate: string,
  status: InvoiceStatus,
  referenceDate = new Date(),
): boolean {
  if (status === "paid") {
    return false
  }

  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) {
    return false
  }

  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  return due < today
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(isoDate)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}
