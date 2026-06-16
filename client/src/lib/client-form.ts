import type { Client } from "@/types/client"

export interface ClientFormValues {
  name: string
  company: string
  email: string
  phone: string
  website: string
  notes: string
  isRetainer: boolean
  retainerHours: string
  retainerRate: string
  retainerCycleDay: string
}

export function clientToFormValues(client?: Client | null): ClientFormValues {
  return {
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    notes: client?.notes ?? "",
    isRetainer: client?.isRetainer ?? false,
    retainerHours:
      client?.retainerHours != null ? String(client.retainerHours) : "",
    retainerRate:
      client?.retainerRate != null ? String(client.retainerRate) : "",
    retainerCycleDay:
      client?.retainerCycleDay != null ? String(client.retainerCycleDay) : "1",
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
    current.notes !== initial.notes ||
    current.isRetainer !== initial.isRetainer ||
    current.retainerHours !== initial.retainerHours ||
    current.retainerRate !== initial.retainerRate ||
    current.retainerCycleDay !== initial.retainerCycleDay
  )
}

export function clientFormToPayload(values: ClientFormValues) {
  const payload = {
    name: values.name.trim(),
    email: values.email.trim(),
    company: values.company.trim(),
    phone: values.phone.trim() || undefined,
    website: values.website.trim() || undefined,
    notes: values.notes.trim() || undefined,
    isRetainer: values.isRetainer,
  } as {
    name: string
    email: string
    company: string
    phone?: string
    website?: string
    notes?: string
    isRetainer: boolean
    retainerHours?: number
    retainerRate?: number
    retainerCycleDay?: number
  }

  if (values.isRetainer) {
    payload.retainerHours = Number(values.retainerHours)
    payload.retainerRate = Number(values.retainerRate)
    payload.retainerCycleDay = Number(values.retainerCycleDay)
  }

  return payload
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

  if (values.isRetainer) {
    const hours = Number(values.retainerHours)
    if (!Number.isFinite(hours) || hours <= 0) {
      return "Monthly hours must be a positive number."
    }

    const rate = Number(values.retainerRate)
    if (!Number.isFinite(rate) || rate < 0) {
      return "Hourly rate must be zero or greater."
    }

    const cycleDay = Number(values.retainerCycleDay)
    if (!Number.isInteger(cycleDay) || cycleDay < 1 || cycleDay > 28) {
      return "Billing cycle start day must be between 1 and 28."
    }
  }

  return null
}
