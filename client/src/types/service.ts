export type ServiceType = "static" | "animated"

export const SERVICE_TYPES: ServiceType[] = ["static", "animated"]

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
