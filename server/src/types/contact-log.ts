export type ContactLogType = "email" | "call" | "meeting" | "note"

export const CONTACT_LOG_TYPES: ContactLogType[] = [
  "email",
  "call",
  "meeting",
  "note",
]

export function isContactLogType(value: unknown): value is ContactLogType {
  return (
    typeof value === "string" &&
    (CONTACT_LOG_TYPES as string[]).includes(value)
  )
}

/** Activity history entry for a lead outreach or follow-up. */
export interface ContactLog {
  id: string
  leadId: string
  type: ContactLogType
  notes?: string
  /** ISO timestamp when the contact occurred. */
  contactedAt: string
  createdAt: string
}

export interface CreateContactLogInput {
  leadId: string
  type: ContactLogType
  notes?: string
  contactedAt: string
  /** When true, or when type includes "response", marks the lead as replied. */
  indicatesResponse?: boolean
}

export function contactLogTypeIndicatesResponse(type: string): boolean {
  return type.toLowerCase().includes("response")
}
