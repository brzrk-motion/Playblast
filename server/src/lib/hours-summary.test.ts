import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildProjectHoursSummary } from "./hours-summary.js"
import type { ProjectServiceWithDetails } from "../types/project-service.js"

function makeProjectService(
  overrides: Partial<ProjectServiceWithDetails> & {
    serviceId: string
    name: string
    hourEstimate: number
    overrideHours?: number | null
  },
): ProjectServiceWithDetails {
  return {
    id: `ps-${overrides.serviceId}`,
    projectId: "project-1",
    serviceId: overrides.serviceId,
    quantity: 1,
    overrideHours: overrides.overrideHours ?? null,
    createdAt: "2026-01-01T00:00:00.000Z",
    service: {
      id: overrides.serviceId,
      name: overrides.name,
      hourEstimate: overrides.hourEstimate,
      hourlyRate: 100,
      type: "animated",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  }
}

describe("buildProjectHoursSummary", () => {
  it("builds per-service estimates and project totals", () => {
    const summary = buildProjectHoursSummary(
      [
        makeProjectService({
          serviceId: "svc-a",
          name: "Animation",
          hourEstimate: 40,
        }),
        makeProjectService({
          serviceId: "svc-b",
          name: "Layout",
          hourEstimate: 20,
          overrideHours: 15,
        }),
      ],
      30,
    )

    assert.equal(summary.lines.length, 2)
    assert.equal(summary.lines[0]?.estimatedHours, 40)
    assert.equal(summary.lines[1]?.estimatedHours, 15)
    assert.equal(summary.totalEstimatedHours, 55)
    assert.equal(summary.totalLoggedHours, 30)
    assert.equal(summary.deltaHours, -25)
  })

  it("returns zeros when no services are attached", () => {
    const summary = buildProjectHoursSummary([], 0)

    assert.deepEqual(summary.lines, [])
    assert.equal(summary.totalEstimatedHours, 0)
    assert.equal(summary.totalLoggedHours, 0)
    assert.equal(summary.deltaHours, 0)
  })
})
