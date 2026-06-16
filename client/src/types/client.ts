import type { Project } from "./project"

export interface RetainerSummary {
  cycleStart: string
  cycleEnd: string
  hoursContracted: number
  hoursLogged: number
  hoursRemaining: number
  estimatedValue: number
  utilizationPercent: number
  isOverage: boolean
}

export interface Client {
  id: string
  name: string
  company?: string
  email: string
  phone?: string
  website?: string
  notes?: string
  convertedFromLeadId?: string
  isRetainer?: boolean
  retainerHours?: number
  retainerRate?: number
  retainerCycleDay?: number
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
  isRetainer?: boolean
  retainerHours?: number
  retainerRate?: number
  retainerCycleDay?: number
}

export interface UpdateClientInput {
  name?: string
  company?: string | null
  email?: string
  phone?: string | null
  website?: string | null
  notes?: string | null
  convertedFromLeadId?: string | null
  isRetainer?: boolean
  retainerHours?: number | null
  retainerRate?: number | null
  retainerCycleDay?: number | null
}

export interface ClientWithProjects extends Client {
  projects: Project[]
  retainerSummary?: RetainerSummary
}
