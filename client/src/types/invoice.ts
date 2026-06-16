export type InvoiceStatus = "unpaid" | "partially_paid" | "paid"

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
  invoiceNumber: string
  issuedAt: string
  dueDate?: string
  netDays?: number
  total: number
}

export interface CreateInvoicePaymentInput {
  amount: number
  paidAt: string
  notes?: string
}

export interface CreateInvoicePaymentResponse {
  payment: InvoicePayment
  invoice: InvoiceWithPayments
}
