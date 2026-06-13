import type { Client } from "@/types/client"

export function clientsById(clients: Client[]): Map<string, Client> {
  return new Map(clients.map((client) => [client.id, client]))
}

/** Primary label for badges and summaries — prefers company name. */
export function clientCompanyLabel(client: Pick<Client, "name" | "company">): string {
  return client.company?.trim() || client.name
}

/** Dropdown option label: name plus company when present. */
export function clientOptionLabel(client: Client): string {
  const company = client.company?.trim()
  return company ? `${client.name} · ${company}` : client.name
}

export function filterClients(clients: Client[], query: string): Client[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return clients
  }

  return clients.filter((client) => {
    const company = client.company?.toLowerCase() ?? ""
    return (
      client.name.toLowerCase().includes(normalized) ||
      company.includes(normalized) ||
      client.email.toLowerCase().includes(normalized)
    )
  })
}
