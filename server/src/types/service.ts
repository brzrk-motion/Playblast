export type ServiceType = "static" | "animated"

export const SERVICE_TYPES: ServiceType[] = ["static", "animated"]

export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === "string" && (SERVICE_TYPES as string[]).includes(value)
}

/** Catalog service offering with estimated hours and hourly rate. */
export interface Service {
  id: string
  name: string
  hourEstimate: number
  hourlyRate: number
  type: ServiceType
  createdAt: string
  updatedAt: string
}

export interface CreateServiceInput {
  studioId: string
  name: string
  hourEstimate: number
  hourlyRate: number
  type: ServiceType
}

export interface UpdateServiceInput {
  name: string
  hourEstimate: number
  hourlyRate: number
  type: ServiceType
}

export interface ServiceProjectUsage {
  projectCount: number
  projects: Array<{ id: string; name: string }>
}
