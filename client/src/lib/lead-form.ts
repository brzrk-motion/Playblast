import type {
  CreateLeadInput,
  Lead,
  LeadFormStatus,
  LeadSource,
  UpdateLeadInput,
} from "@/types/lead"
import { LEAD_FORM_STATUSES, LEAD_SOURCES } from "@/types/lead"

export interface LeadFormValues {
  name: string
  company: string
  email: string
  phone: string
  source: LeadSource | ""
  status: LeadFormStatus
  notes: string
  assignedToUserId: string
}

export function leadToFormValues(lead?: Lead | null): LeadFormValues {
  const status = lead?.status
  const formStatus: LeadFormStatus =
    status && (LEAD_FORM_STATUSES as readonly string[]).includes(status)
      ? (status as LeadFormStatus)
      : "new"

  const source = lead?.source
  const formSource: LeadSource | "" =
    source && (LEAD_SOURCES as readonly string[]).includes(source)
      ? (source as LeadSource)
      : ""

  return {
    name: lead?.name ?? "",
    company: lead?.company ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    source: formSource,
    status: formStatus,
    notes: lead?.notes ?? "",
    assignedToUserId: lead?.assignedToUserId ?? "",
  }
}

export function isLeadFormDirty(
  current: LeadFormValues,
  initial: LeadFormValues,
): boolean {
  return (
    current.name !== initial.name ||
    current.company !== initial.company ||
    current.email !== initial.email ||
    current.phone !== initial.phone ||
    current.source !== initial.source ||
    current.status !== initial.status ||
    current.notes !== initial.notes ||
    current.assignedToUserId !== initial.assignedToUserId
  )
}

function baseLeadFormPayload(values: LeadFormValues): CreateLeadInput {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    company: values.company.trim() || undefined,
    phone: values.phone.trim() || undefined,
    source: values.source || undefined,
    status: values.status,
    notes: values.notes.trim() || undefined,
  }
}

export function leadFormToPayload(values: LeadFormValues): CreateLeadInput
export function leadFormToPayload(
  values: LeadFormValues,
  options: { includeAssignee: true },
): UpdateLeadInput
export function leadFormToPayload(
  values: LeadFormValues,
  options?: { includeAssignee?: boolean },
): CreateLeadInput | UpdateLeadInput {
  const payload = baseLeadFormPayload(values)

  if (options?.includeAssignee) {
    return {
      ...payload,
      assignedToUserId: values.assignedToUserId || null,
    }
  }

  return payload
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLeadForm(values: LeadFormValues): string | null {
  if (!values.name.trim()) {
    return "Name is required."
  }

  const email = values.email.trim()
  if (!email) {
    return "Email is required."
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address."
  }

  return null
}
