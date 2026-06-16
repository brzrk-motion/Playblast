import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calculateProjectServicesEstimate,
  calculateProjectServicesEstimatedHours,
  effectiveProjectServiceHours,
  projectServiceLineTotal,
} from "./service-estimate.js"
import type { ProjectServiceWithDetails } from "../types/project-service.js"

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
    overrideHours: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("calculateProjectServicesEstimate", () => {
  it("returns zero for an empty list", () => {
    assert.equal(calculateProjectServicesEstimate([]), 0)
  })

  it("sums line totals using override hours when set", () => {
    const items = [
      makeProjectService({
        overrideHours: 6,
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
          name: "Animated A",
          hourEstimate: 8,
          hourlyRate: 200,
          type: "animated",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    ]

    assert.equal(effectiveProjectServiceHours(items[0]!), 6)
    assert.equal(projectServiceLineTotal(items[0]!), 600)
    assert.equal(calculateProjectServicesEstimate(items), 2200)
    assert.equal(calculateProjectServicesEstimatedHours(items), 14)
  })
})
