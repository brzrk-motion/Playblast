import type { Project } from "./project"

export interface Client {
  id: string
  name: string
  company?: string
  email: string
  phone?: string
  website?: string
  notes?: string
  convertedFromLeadId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateClientInput {
  name: string
  email: string
  company?: string
  phone?: string
  website?: string
  notes?: string
  convertedFromLeadId?: string
}

export interface UpdateClientInput {
  name?: string
  company?: string | null
  email?: string
  phone?: string | null
  website?: string | null
  notes?: string | null
  convertedFromLeadId?: string | null
}

export interface ClientWithProjects extends Client {
  projects: Project[]
}
