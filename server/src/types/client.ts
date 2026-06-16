import type { Project } from "./project.js"
import type { RetainerSummary } from "../lib/retainer-cycle.js"

/** Converted lead or manually added business contact. */
export interface Client {
  id: string
  name: string
  company?: string
  email: string
  phone?: string
  website?: string
  notes?: string
  /** Lead that was converted into this client, when applicable. */
  convertedFromLeadId?: string
  isRetainer?: boolean
  retainerHours?: number
  retainerRate?: number
  /** Day of month (1–28) when the billing cycle starts. */
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

export type { RetainerSummary }
