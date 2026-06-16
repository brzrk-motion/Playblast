import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildCapacityRows,
  buildProjectCapacityRow,
  capacityGaugePercent,
  filterActivePipelineProjects,
  isCapacityOverload,
  projectPercentComplete,
  projectRemainingHours,
  summarizeCapacity,
} from "./capacity.js"
import type { ProjectSummary } from "@/types/project"

function makeProject(
  overrides: Partial<ProjectSummary> & Pick<ProjectSummary, "id" | "name">,
): ProjectSummary {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    deliverableCount: 0,
    versionCount: 0,
    openCommentCount: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    deliverableStatusCounts: {
      not_started: 0,
      in_progress: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
    },
    nextMilestone: null,
    ...overrides,
  }
}

describe("filterActivePipelineProjects", () => {
  it("includes in progress and pending review projects", () => {
    const projects = [
      makeProject({
        id: "active",
        name: "Active",
        deliverableCount: 1,
        deliverableStatusCounts: {
          not_started: 0,
          in_progress: 1,
          in_review: 0,
          approved: 0,
          rejected: 0,
        },
      }),
      makeProject({
        id: "review",
        name: "Review",
        deliverableCount: 1,
        deliverableStatusCounts: {
          not_started: 0,
          in_progress: 0,
          in_review: 1,
          approved: 0,
          rejected: 0,
        },
      }),
      makeProject({
        id: "approved",
        name: "Approved",
        deliverableCount: 1,
        deliverableStatusCounts: {
          not_started: 0,
          in_progress: 0,
          in_review: 0,
          approved: 1,
          rejected: 0,
        },
      }),
      makeProject({
        id: "completed",
        name: "Completed",
        status: "completed",
      }),
    ]

    const active = filterActivePipelineProjects(projects)
    assert.deepEqual(
      active.map((project) => project.id),
      ["active", "review"],
    )
  })
})

describe("buildProjectCapacityRow", () => {
  it("computes remaining hours and percent complete", () => {
    const row = buildProjectCapacityRow(
      makeProject({
        id: "p1",
        name: "Project",
        servicesEstimatedHours: 40,
        servicesLoggedHours: 10,
      }),
    )

    assert.equal(row.estimatedHours, 40)
    assert.equal(row.loggedHours, 10)
    assert.equal(row.remainingHours, 30)
    assert.equal(row.percentComplete, 25)
  })

  it("returns null logged metrics when time tracking is unavailable", () => {
    const row = buildProjectCapacityRow(
      makeProject({
        id: "p2",
        name: "Legacy",
        servicesEstimatedHours: 20,
      }),
    )

    assert.equal(row.loggedHours, null)
    assert.equal(row.remainingHours, null)
    assert.equal(row.percentComplete, null)
  })
})

describe("summarizeCapacity", () => {
  it("rolls up active project hours", () => {
    const totals = summarizeCapacity([
      makeProject({
        id: "a",
        name: "A",
        servicesEstimatedHours: 30,
        servicesLoggedHours: 12,
      }),
      makeProject({
        id: "b",
        name: "B",
        deliverableCount: 1,
        deliverableStatusCounts: {
          not_started: 0,
          in_progress: 0,
          in_review: 1,
          approved: 0,
          rejected: 0,
        },
        servicesEstimatedHours: 20,
        servicesLoggedHours: 5,
      }),
      makeProject({
        id: "c",
        name: "C",
        deliverableCount: 1,
        deliverableStatusCounts: {
          not_started: 0,
          in_progress: 0,
          in_review: 0,
          approved: 1,
          rejected: 0,
        },
        servicesEstimatedHours: 100,
        servicesLoggedHours: 50,
      }),
    ])

    assert.deepEqual(totals, {
      activeProjectCount: 2,
      totalEstimatedHours: 50,
      totalLoggedHours: 17,
      totalRemainingHours: 33,
    })
  })

  it("degrades gracefully without time tracking data", () => {
    const totals = summarizeCapacity([
      makeProject({
        id: "a",
        name: "A",
        servicesEstimatedHours: 25,
      }),
    ])

    assert.deepEqual(totals, {
      activeProjectCount: 1,
      totalEstimatedHours: 25,
      totalLoggedHours: null,
      totalRemainingHours: null,
    })
  })
})

describe("projectRemainingHours", () => {
  it("never returns negative remaining hours", () => {
    assert.equal(projectRemainingHours(10, 15), 0)
  })
})

describe("projectPercentComplete", () => {
  it("caps completion at 100%", () => {
    assert.equal(projectPercentComplete(10, 20), 100)
  })
})

describe("capacityGaugePercent", () => {
  it("calculates remaining hours against weekly capacity", () => {
    assert.equal(capacityGaugePercent(80, 40), 100)
    assert.equal(capacityGaugePercent(20, 40), 50)
  })
})

describe("isCapacityOverload", () => {
  it("flags overload when remaining hours exceed weekly capacity", () => {
    assert.equal(isCapacityOverload(120, 40), true)
    assert.equal(isCapacityOverload(30, 40), false)
    assert.equal(isCapacityOverload(null, 40), false)
  })
})

describe("buildCapacityRows", () => {
  it("sorts active projects by name", () => {
    const rows = buildCapacityRows([
      makeProject({ id: "z", name: "Zulu" }),
      makeProject({ id: "a", name: "Alpha" }),
    ])

    assert.deepEqual(
      rows.map((row) => row.project.name),
      ["Alpha", "Zulu"],
    )
  })
})
