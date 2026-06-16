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

export interface Invoice {
  id: string
  projectId: string
  invoiceNumber: string
  issuedAt: string
  dueDate: string
  total: number
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

export interface CreateInvoiceInput {
  projectId: string
  invoiceNumber: string
  issuedAt: string
  dueDate: string
  total: number
}

export interface UpdateInvoiceInput {
  invoiceNumber?: string
  issuedAt?: string
  dueDate?: string
  total?: number
}

export interface CreateInvoicePaymentInput {
  invoiceId: string
  amount: number
  paidAt: string
  notes?: string
}
