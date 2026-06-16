export type InvoiceStatus = "unpaid" | "partially_paid" | "paid"

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "unpaid",
  "partially_paid",
  "paid",
]

export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return (
    typeof value === "string" &&
    (INVOICE_STATUSES as string[]).includes(value)
  )
}

export interface InvoiceLineItem {
  serviceName: string
  hours: number
  hourlyRate: number
  lineTotal: number
}

export interface Invoice {
  id: string
  invoiceNumber: number
  projectId: string
  clientId: string
  projectName: string
  clientName: string
  clientCompany?: string
  clientEmail: string
  currency: string
  grandTotal: number
  lineItems: InvoiceLineItem[]
  invoiceDate: string
  dueDate: string
  status: InvoiceStatus
  createdAt: string
}

export interface InvoicePayment {
  id: string
  invoiceId: string
  amount: number
  paidAt: string
  notes?: string
  createdAt: string
}

export interface InvoiceSummary extends Invoice {
  amountPaid: number
  outstandingBalance: number
  isOverdue: boolean
}

export interface InvoiceWithPayments extends InvoiceSummary {
  payments: InvoicePayment[]
}

export interface UpdateInvoiceInput {
  dueDate?: string
}

export interface CreateInvoicePaymentInput {
  invoiceId: string
  amount: number
  paidAt: string
  notes?: string
}
