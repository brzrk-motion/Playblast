import type { Client } from "@/types/client"

export interface ClientFormValues {
  name: string
  company: string
  email: string
  phone: string
  website: string
  notes: string
}

export function clientToFormValues(client?: Client | null): ClientFormValues {
  return {
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    notes: client?.notes ?? "",
  }
}

export function isClientFormDirty(
  current: ClientFormValues,
  initial: ClientFormValues,
): boolean {
  return (
    current.name !== initial.name ||
    current.company !== initial.company ||
    current.email !== initial.email ||
    current.phone !== initial.phone ||
    current.website !== initial.website ||
    current.notes !== initial.notes
  )
}

export function clientFormToPayload(values: ClientFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    company: values.company.trim(),
    phone: values.phone.trim() || undefined,
    website: values.website.trim() || undefined,
    notes: values.notes.trim() || undefined,
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidWebsite(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function validateClientForm(values: ClientFormValues): string | null {
  if (!values.name.trim()) {
    return "Name is required."
  }

  if (!values.company.trim()) {
    return "Company is required."
  }

  const email = values.email.trim()
  if (!email) {
    return "Email is required."
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address."
  }

  const website = values.website.trim()
  if (website && !isValidWebsite(website)) {
    return "Enter a valid website URL (http:// or https://)."
  }

  return null
}
