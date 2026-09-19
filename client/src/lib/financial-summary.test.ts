import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  filterFinancialActiveProjects,
  isFinancialActiveProject,
  isProjectOverBudget,
  summarizeFinancials,
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

describe("isFinancialActiveProject", () => {
  it("excludes archived and completed projects", () => {
    assert.equal(
      isFinancialActiveProject(
        makeProject({ id: "1", name: "Active", status: "active" }),
      ),
      true,
    )
    assert.equal(
      isFinancialActiveProject(
        makeProject({ id: "2", name: "Done", status: "completed" }),
      ),
      false,
    )
    assert.equal(
      isFinancialActiveProject(
        makeProject({
          id: "3",
          name: "Archived",
          archivedAt: "2026-02-01T00:00:00.000Z",
        }),
      ),
      false,
    )
  })
})

describe("summarizeFinancials", () => {
  it("returns zero totals when no active projects have services or budgets", () => {
    const summary = summarizeFinancials([
      makeProject({ id: "1", name: "Alpha" }),
      makeProject({ id: "2", name: "Beta", status: "completed" }),
    ])

    assert.equal(summary.activeEstimate, 0)
    assert.equal(summary.budgetCommitted, 0)
    assert.equal(summary.overBudgetCount, 0)
    assert.equal(summary.currency, "USD")
  })

  it("sums estimates and committed budgets across active projects", () => {
    const summary = summarizeFinancials([
      makeProject({
        id: "1",
        name: "Alpha",
        servicesEstimate: 5000,
        budget: { total: 8000, currency: "USD" },
      }),
      makeProject({
        id: "2",
        name: "Beta",
        servicesEstimate: 2400,
        budget: { total: 4600, currency: "USD" },
      }),
      makeProject({
        id: "3",
        name: "Gamma",
        status: "on_hold",
        servicesEstimate: 1000,
      }),
      makeProject({
        id: "4",
        name: "Done",
        status: "completed",
        servicesEstimate: 9999,
        budget: { total: 10000, currency: "USD" },
      }),
    ])

    assert.equal(summary.activeEstimate, 8400)
    assert.equal(summary.budgetCommitted, 12600)
    assert.equal(summary.overBudgetCount, 0)
  })

  it("counts projects where estimate exceeds an explicit budget", () => {
    const projects = [
      makeProject({
        id: "1",
        name: "Over",
        servicesEstimate: 5000,
        budget: { total: 4000, currency: "USD" },
      }),
      makeProject({
        id: "2",
        name: "Under",
        servicesEstimate: 2000,
        budget: { total: 4000, currency: "USD" },
      }),
      makeProject({
        id: "3",
        name: "No budget",
        servicesEstimate: 9000,
      }),
    ]

    const summary = summarizeFinancials(projects)

    assert.equal(summary.overBudgetCount, 1)
    assert.equal(isProjectOverBudget(projects[0]!), true)
    assert.equal(isProjectOverBudget(projects[1]!), false)
    assert.equal(isProjectOverBudget(projects[2]!), false)
  })
})

describe("filterFinancialActiveProjects", () => {
  it("keeps only non-archived, non-completed projects", () => {
    const projects = [
      makeProject({ id: "1", name: "Active" }),
      makeProject({ id: "2", name: "Completed", status: "completed" }),
      makeProject({
        id: "3",
        name: "Archived",
        archivedAt: "2026-03-01T00:00:00.000Z",
      }),
    ]

    const active = filterFinancialActiveProjects(projects)
    assert.deepEqual(active.map((project) => project.id), ["1"])
  })
})
