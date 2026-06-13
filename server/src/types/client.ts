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
