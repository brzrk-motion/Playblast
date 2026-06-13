export type ContactLogType = "email" | "call" | "meeting" | "note"

export const CONTACT_LOG_TYPES: ContactLogType[] = [
  "email",
  "call",
  "meeting",
  "note",
]

export interface ContactLog {
  id: string
  leadId: string
  type: ContactLogType
  notes?: string
  contactedAt: string
  createdAt: string
}

export interface CreateContactLogBody {
  type: ContactLogType
  notes?: string
  contactedAt: string
  indicatesResponse?: boolean
}
