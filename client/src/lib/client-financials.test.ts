import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ClientLinkedProject } from "@/types/client"
import { summarizeClientFinancials } from "./client-financials"

function project(
  overrides: Partial<ClientLinkedProject> & Pick<ClientLinkedProject, "id" | "name">,
): ClientLinkedProject {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    ...overrides,
  }
}

describe("summarizeClientFinancials", () => {
  it("sums estimates only from projects with attached services", () => {
    const summary = summarizeClientFinancials([
      project({
        id: "a",
        name: "With services",
        servicesEstimate: 1000,
      }),
      project({
        id: "b",
        name: "No services",
      }),
    ])

    assert.equal(summary.totalEstimate, 1000)
    assert.equal(summary.hasEstimateData, true)
    assert.equal(summary.hasBudgetData, false)
    assert.equal(summary.hasFinancialData, true)
  })

  it("sums budgets only from projects with a budget set", () => {
    const summary = summarizeClientFinancials([
      project({
        id: "a",
        name: "Budgeted",
        budget: { total: 5000, currency: "USD" },
      }),
      project({
        id: "b",
        name: "Unbudgeted",
        servicesEstimate: 1200,
      }),
    ])

    assert.equal(summary.totalBudget, 5000)
    assert.equal(summary.hasBudgetData, true)
    assert.equal(summary.totalEstimate, 1200)
  })

  it("computes overall variance as total budget minus total estimate", () => {
    const summary = summarizeClientFinancials([
      project({
        id: "a",
        name: "Under",
        servicesEstimate: 2000,
        budget: { total: 5000, currency: "USD" },
      }),
      project({
        id: "b",
        name: "Over",
        servicesEstimate: 4500,
        budget: { total: 4000, currency: "USD" },
      }),
    ])

    assert.equal(summary.totalEstimate, 6500)
    assert.equal(summary.totalBudget, 9000)
    assert.equal(summary.variance, 2500)
  })

  it("flags aggregate health as over when any linked project is over budget", () => {
    const summary = summarizeClientFinancials([
      project({
        id: "a",
        name: "Healthy",
        servicesEstimate: 1000,
        budget: { total: 5000, currency: "USD" },
      }),
      project({
        id: "b",
        name: "Over",
        servicesEstimate: 4500,
        budget: { total: 4000, currency: "USD" },
      }),
    ])

    assert.equal(summary.aggregateBudgetStatus, "over")
  })

  it("returns no financial data when no projects have services or budgets", () => {
    const summary = summarizeClientFinancials([
      project({ id: "a", name: "Empty" }),
      project({ id: "b", name: "Also empty", budget: { total: 0, currency: "USD" } }),
    ])

    assert.equal(summary.hasFinancialData, false)
    assert.equal(summary.aggregateBudgetStatus, null)
  })
})
