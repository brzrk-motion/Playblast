import type { Service, ServiceType } from "@/types/service"
import { SERVICE_TYPES } from "@/types/service"

export interface ServiceFormValues {
  name: string
  hourEstimate: string
  hourlyRate: string
  type: ServiceType
}

export function serviceToFormValues(
  service?: Service | null,
): ServiceFormValues {
  return {
    name: service?.name ?? "",
    hourEstimate:
      service?.hourEstimate !== undefined
        ? String(service.hourEstimate)
        : "",
    hourlyRate:
      service?.hourlyRate !== undefined ? String(service.hourlyRate) : "",
    type: service?.type ?? "static",
  }
}

export function isServiceFormDirty(
  current: ServiceFormValues,
  initial: ServiceFormValues,
): boolean {
  return (
    current.name !== initial.name ||
    current.hourEstimate !== initial.hourEstimate ||
    current.hourlyRate !== initial.hourlyRate ||
    current.type !== initial.type
  )
}

export function serviceFormToPayload(values: ServiceFormValues) {
  return {
    name: values.name.trim(),
    hourEstimate: Number(values.hourEstimate),
    hourlyRate: Number(values.hourlyRate),
    type: values.type,
  }
}

function parseNonNegativeNumber(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

export function validateServiceForm(values: ServiceFormValues): string | null {
  if (!values.name.trim()) {
    return "Name is required."
  }

  if (parseNonNegativeNumber(values.hourEstimate) === null) {
    return "Hour estimate must be a non-negative number."
  }

  if (parseNonNegativeNumber(values.hourlyRate) === null) {
    return "Hourly rate must be a non-negative number."
  }

  if (!(SERVICE_TYPES as string[]).includes(values.type)) {
    return "Select a valid service type."
  }

  return null
}
