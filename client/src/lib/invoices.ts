import type { InvoiceStatus } from "@/types/invoice"

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
}

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  unpaid: "border-muted-foreground/30 text-muted-foreground",
  partially_paid: "border-status-warning text-status-warning-foreground",
  paid: "border-status-success text-status-success-foreground",
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
