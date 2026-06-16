import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calculatePipelineRevenueTotals,
  derivePipelineStatus,
  groupProjectsByPipelineStatus,
  projectEstimatedValue,
  summarizePipelineColumn,
} from "./pipeline.js"
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
    servicesLoggedHours: 0,
    ...overrides,
  }
}

describe("derivePipelineStatus", () => {
  it("maps completed projects to completed", () => {
    const project = makeProject({
      id: "p1",
      name: "Done",
      status: "completed",
    })
    assert.equal(derivePipelineStatus(project), "completed")
  })

  it("maps in-review deliverables to pending review", () => {
    const project = makeProject({
      id: "p2",
      name: "Review",
      deliverableCount: 2,
      deliverableStatusCounts: {
        not_started: 0,
        in_progress: 1,
        in_review: 1,
        approved: 0,
        rejected: 0,
      },
    })
    assert.equal(derivePipelineStatus(project), "pending_review")
  })

  it("maps all-approved deliverables to approved", () => {
    const project = makeProject({
      id: "p3",
      name: "Won",
      deliverableCount: 2,
      deliverableStatusCounts: {
        not_started: 0,
        in_progress: 0,
        in_review: 0,
        approved: 2,
        rejected: 0,
      },
    })
    assert.equal(derivePipelineStatus(project), "approved")
  })

  it("defaults active work to in progress", () => {
    const project = makeProject({
      id: "p4",
      name: "Active",
      deliverableCount: 1,
      deliverableStatusCounts: {
        not_started: 0,
        in_progress: 1,
        in_review: 0,
        approved: 0,
        rejected: 0,
      },
    })
    assert.equal(derivePipelineStatus(project), "in_progress")
  })
})

describe("projectEstimatedValue", () => {
  it("uses services estimate when present", () => {
    const project = makeProject({
      id: "p5",
      name: "Estimate",
      servicesEstimate: 12500,
    })
    assert.equal(projectEstimatedValue(project), 12500)
  })

  it("returns zero when no services estimate", () => {
    const project = makeProject({ id: "p6", name: "Empty" })
    assert.equal(projectEstimatedValue(project), 0)
  })
})

describe("calculatePipelineRevenueTotals", () => {
  it("sums won and in-flight values by pipeline stage", () => {
    const projects = [
      makeProject({
        id: "a",
        name: "Active",
        servicesEstimate: 1000,
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
        id: "b",
        name: "Review",
        servicesEstimate: 2000,
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
        id: "c",
        name: "Approved",
        servicesEstimate: 3000,
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
        id: "d",
        name: "Completed",
        status: "completed",
        servicesEstimate: 4000,
      }),
    ]

    const totals = calculatePipelineRevenueTotals(projects)
    assert.equal(totals.inFlight, 3000)
    assert.equal(totals.won, 7000)
  })
})

describe("groupProjectsByPipelineStatus", () => {
  it("groups and sorts projects by name within each column", () => {
    const projects = [
      makeProject({ id: "z", name: "Zulu" }),
      makeProject({ id: "a", name: "Alpha" }),
    ]

    const groups = groupProjectsByPipelineStatus(projects)
    assert.deepEqual(
      groups.in_progress.map((project) => project.name),
      ["Alpha", "Zulu"],
    )
  })
})

describe("summarizePipelineColumn", () => {
  it("counts projects and sums estimated value", () => {
    const projects = [
      makeProject({ id: "1", name: "One", servicesEstimate: 500 }),
      makeProject({ id: "2", name: "Two", servicesEstimate: 250 }),
    ]

    assert.deepEqual(summarizePipelineColumn(projects), {
      count: 2,
      totalValue: 750,
    })
  })
})
