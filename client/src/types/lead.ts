export type LeadStatus =
  | "new"
  | "contacted"
  | "replied"
  | "negotiating"
  | "converted"
  | "lost"

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "replied",
  "negotiating",
  "converted",
  "lost",
]

export interface Lead {
  id: string
  name: string
  company?: string
  email: string
  phone?: string
  source?: string
  status: LeadStatus
  notes?: string
  lastContactedAt?: string
  replied: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateLeadInput {
  name: string
  email: string
  company?: string
  phone?: string
  source?: string
  status?: LeadStatus
  notes?: string
  lastContactedAt?: string
  replied?: boolean
}

export interface UpdateLeadInput {
  name?: string
  company?: string | null
  email?: string
  phone?: string | null
  source?: string | null
  status?: LeadStatus
  notes?: string | null
  lastContactedAt?: string | null
  replied?: boolean
}
