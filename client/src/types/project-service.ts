import type { Service } from "@/types/service"

export interface ProjectService {
  id: string
  projectId: string
  serviceId: string
  quantity: number
  createdAt: string
}

export interface ProjectServiceWithDetails extends ProjectService {
  service: Service
}

export interface AddProjectServiceInput {
  serviceId: string
  quantity?: number
}
