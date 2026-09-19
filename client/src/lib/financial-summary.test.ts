import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  countProjectsOverBudget,
  filterActiveFinancialProjects,
  isProjectOverBudget,
  totalActiveEstimate,
  totalBudgetCommitted,
} from "./financial-summary.js"
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

describe("filterActiveFinancialProjects", () => {
  it("excludes archived and completed projects", () => {
    const projects = [
      makeProject({ id: "1", name: "Active" }),
      makeProject({ id: "2", name: "On hold", status: "on_hold" }),
      makeProject({ id: "3", name: "Done", status: "completed" }),
      makeProject({
        id: "4",
        name: "Archived",
        archivedAt: "2026-02-01T00:00:00.000Z",
      }),
    ]

    assert.deepEqual(
      filterActiveFinancialProjects(projects).map((project) => project.id),
      ["1", "2"],
    )
  })
})

describe("financial summary totals", () => {
  const projects = [
    makeProject({
      id: "1",
      name: "Alpha",
      servicesEstimate: 12_400,
      budget: { total: 10_000, currency: "USD" },
    }),
    makeProject({
      id: "2",
      name: "Beta",
      servicesEstimate: 3_000,
      budget: { total: 5_000, currency: "USD" },
    }),
    makeProject({
      id: "3",
      name: "Gamma",
      servicesEstimate: 2_000,
    }),
    makeProject({
      id: "4",
      name: "Delta",
      status: "completed",
      servicesEstimate: 9_999,
      budget: { total: 1_000, currency: "USD" },
    }),
  ]

  it("sums active service estimates", () => {
    assert.equal(totalActiveEstimate(projects), 17_400)
  })

  it("sums budgets only for active projects with an explicit budget", () => {
    assert.equal(totalBudgetCommitted(projects), 15_000)
  })

  it("counts active projects where estimate exceeds budget", () => {
    assert.equal(countProjectsOverBudget(projects), 1)
    assert.equal(isProjectOverBudget(projects[0]!), true)
    assert.equal(isProjectOverBudget(projects[1]!), false)
    assert.equal(isProjectOverBudget(projects[2]!), false)
  })

  it("handles empty portfolios gracefully", () => {
    assert.equal(totalActiveEstimate([]), 0)
    assert.equal(totalBudgetCommitted([]), 0)
    assert.equal(countProjectsOverBudget([]), 0)
  })
})
