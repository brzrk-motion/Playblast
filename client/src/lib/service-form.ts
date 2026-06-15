import type { Service, ServiceType } from "@/types/service"
import { SERVICE_TYPES } from "@/types/service"

export interface ServiceFormValues {
  name: string
  hourEstimate: string
  hourlyRate: string
  type: ServiceType
}

export type ServiceFormFieldErrors = Partial<
  Record<keyof ServiceFormValues, string>
>

const MAX_NAME_LENGTH = 100

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

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

function hasAtMostOneDecimalPlace(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed.includes(".")) {
    return true
  }

  const [, decimals = ""] = trimmed.split(".")
  return decimals.length <= 1
}

export function hasServiceFormErrors(errors: ServiceFormFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function validateServiceForm(
  values: ServiceFormValues,
): ServiceFormFieldErrors {
  const errors: ServiceFormFieldErrors = {}
  const name = values.name.trim()

  if (!name) {
    errors.name = "Name is required."
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`
  }

  if (!values.hourEstimate.trim()) {
    errors.hourEstimate = "Hour estimate is required."
  } else if (parsePositiveNumber(values.hourEstimate) === null) {
    errors.hourEstimate = "Hour estimate must be greater than 0."
  } else if (!hasAtMostOneDecimalPlace(values.hourEstimate)) {
    errors.hourEstimate = "Hour estimate allows at most one decimal place."
  }

  if (!values.hourlyRate.trim()) {
    errors.hourlyRate = "Hourly rate is required."
  } else if (parsePositiveNumber(values.hourlyRate) === null) {
    errors.hourlyRate = "Hourly rate must be greater than 0."
  }

  if (!(SERVICE_TYPES as string[]).includes(values.type)) {
    errors.type = "Select a service type."
  }

  return errors
}
