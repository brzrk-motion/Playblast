import type { Request } from "express"

export function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export function getProjectIdParam(req: Request): string {
  return getParam((req.params as { projectId: string | string[] }).projectId)
}

export function getVersionRouteParams(req: Request): {
  deliverableId: string
  version: string
} {
  const params = req.params as {
    deliverableId: string | string[]
    version: string | string[]
  }

  return {
    deliverableId: getParam(params.deliverableId),
    version: getParam(params.version),
  }
}

export function parsePositiveNumber(
  value: unknown,
  fieldName: string,
): { value: number } | { error: string } {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return { error: `${fieldName} must be greater than 0.` }
  }

  return { value }
}

export function hasAtMostOneDecimalPlace(value: number): boolean {
  return Math.round(value * 10) / 10 === value
}
