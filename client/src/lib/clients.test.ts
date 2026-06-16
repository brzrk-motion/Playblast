import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ClientListItem } from "@/types/client"
import { sortClients } from "./clients"

describe("sortClients", () => {
  const clients: ClientListItem[] = [
    {
      id: "a",
      name: "Alpha",
      email: "a@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lifetimeValue: {
        totalEstimated: 500,
        activeEstimated: 500,
        completedEstimated: 0,
      },
    },
    {
      id: "b",
      name: "Bravo",
      email: "b@example.com",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      lifetimeValue: {
        totalEstimated: 2500,
        activeEstimated: 1000,
        completedEstimated: 1500,
      },
    },
  ]

  it("sorts by lifetime value descending", () => {
    const sorted = sortClients(clients, "lifetimeValue", "desc")
    assert.deepEqual(sorted.map((client) => client.id), ["b", "a"])
  })

  it("sorts by name ascending", () => {
    const sorted = sortClients(clients, "name", "asc")
    assert.deepEqual(sorted.map((client) => client.id), ["a", "b"])
  })
})
