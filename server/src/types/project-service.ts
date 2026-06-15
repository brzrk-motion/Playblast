import type { Service } from "./service.js"

/** Join record linking a catalog service to a project with a unit quantity. */
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
