import type { Client, ClientListItem } from "@/types/client"

export type ClientSortField = "name" | "lifetimeValue" | "createdAt"
export type SortDirection = "asc" | "desc"

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

export function sortClients(
  clients: ClientListItem[],
  field: ClientSortField,
  direction: SortDirection,
): ClientListItem[] {
  const sorted = [...clients]
  const factor = direction === "asc" ? 1 : -1

  sorted.sort((left, right) => {
    switch (field) {
      case "name":
        return (
          factor *
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        )
      case "lifetimeValue": {
        const delta =
          left.lifetimeValue.totalEstimated - right.lifetimeValue.totalEstimated
        if (delta !== 0) {
          return factor * delta
        }
        return (
          factor *
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        )
      }
      case "createdAt":
        return (
          factor *
          (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        )
      default:
        return 0
    }
  })

  return sorted
}
