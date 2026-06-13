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

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as string[]).includes(value)
}

/** Sales pipeline contact before conversion to a client. */
export interface Lead {
  id: string
  name: string
  company?: string
  email: string
  phone?: string
  source?: string
  status: LeadStatus
  notes?: string
  /** ISO timestamp of most recent outreach. */
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
