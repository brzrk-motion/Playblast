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
  createdAt: string
}
