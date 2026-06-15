import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calculateProjectCostEstimate,
  projectServiceLineTotal,
} from "./service-estimate.js"
import type { ProjectServiceWithDetails } from "@/types/project-service"

function makeProjectService(
  overrides: Partial<ProjectServiceWithDetails> & {
    service: ProjectServiceWithDetails["service"]
  },
): ProjectServiceWithDetails {
  return {
    id: "ps-1",
    projectId: "project-1",
    serviceId: overrides.service.id,
    quantity: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("projectServiceLineTotal", () => {
  it("multiplies hour estimate by hourly rate", () => {
    const item = makeProjectService({
      service: {
        id: "svc-1",
        name: "Layout",
        hourEstimate: 10,
        hourlyRate: 125,
        type: "static",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    })

    assert.equal(projectServiceLineTotal(item), 1250)
  })
})

describe("calculateProjectCostEstimate", () => {
  it("returns zero totals for an empty list", () => {
    const estimate = calculateProjectCostEstimate([])

    assert.equal(estimate.lines.length, 0)
    assert.equal(estimate.typeSubtotals.length, 0)
    assert.equal(estimate.totalHours, 0)
    assert.equal(estimate.totalEstimate, 0)
  })

  it("sums line totals and groups subtotals by type", () => {
    const items = [
      makeProjectService({
        id: "ps-1",
        serviceId: "svc-1",
        service: {
          id: "svc-1",
          name: "Static A",
          hourEstimate: 4,
          hourlyRate: 100,
          type: "static",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
      makeProjectService({
        id: "ps-2",
        serviceId: "svc-2",
        service: {
          id: "svc-2",
          name: "Static B",
          hourEstimate: 2,
          hourlyRate: 150,
          type: "static",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
      makeProjectService({
        id: "ps-3",
        serviceId: "svc-3",
        service: {
          id: "svc-3",
          name: "Animated A",
          hourEstimate: 8,
          hourlyRate: 200,
          type: "animated",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    ]

    const estimate = calculateProjectCostEstimate(items)

    assert.equal(estimate.totalHours, 14)
    assert.equal(estimate.totalEstimate, 2300)
    assert.equal(estimate.typeSubtotals.length, 2)
    assert.deepEqual(
      estimate.typeSubtotals.map((subtotal) => ({
        type: subtotal.type,
        hours: subtotal.hours,
        lineTotal: subtotal.lineTotal,
      })),
      [
        { type: "static", hours: 6, lineTotal: 700 },
        { type: "animated", hours: 8, lineTotal: 1600 },
      ],
    )
  })
})
