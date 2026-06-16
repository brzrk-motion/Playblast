export type InvoiceStatus = "unpaid" | "partially_paid" | "paid"

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

export interface CreateInvoicePaymentInput {
  amount: number
  paidAt: string
  notes?: string
}

export interface CreateInvoicePaymentResponse {
  payment: InvoicePayment
  invoice: InvoiceWithPayments
}
