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

/** Statuses available in add/edit lead forms. */
export const LEAD_FORM_STATUSES = [
  "new",
  "contacted",
  "replied",
  "negotiating",
] as const satisfies readonly LeadStatus[]

export type LeadFormStatus = (typeof LEAD_FORM_STATUSES)[number]

export const LEAD_SOURCES = [
  "Instagram",
  "Referral",
  "Cold Outreach",
  "Website",
  "Event",
  "Other",
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

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
