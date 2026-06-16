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

export const DUE_DATE_PRESETS = [
  { label: "Net 7", days: 7 },
  { label: "Net 14", days: 14 },
  { label: "Net 30", days: 30 },
] as const

export function formatInvoiceDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(isoDate)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}
