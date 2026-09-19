import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateClientFinancialSummary } from "./client-financial-summary"
import type { ClientLinkedProject } from "@/types/client"

function makeProject(
  overrides: Partial<ClientLinkedProject> & Pick<ClientLinkedProject, "id" | "name">,
): ClientLinkedProject {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    ...overrides,
  }
}

describe("calculateClientFinancialSummary", () => {
  it("sums estimates only from projects with services", () => {
    const summary = calculateClientFinancialSummary([
      makeProject({
        id: "a",
        name: "Alpha",
        servicesEstimate: 1000,
      }),
      makeProject({
        id: "b",
        name: "Bravo",
      }),
      makeProject({
        id: "c",
        name: "Charlie",
        servicesEstimate: 2500,
      }),
    ])

    assert.equal(summary.totalEstimate, 3500)
    assert.equal(summary.hasEstimates, true)
  })

  it("sums budgets only from projects with a budget set", () => {
    const summary = calculateClientFinancialSummary([
      makeProject({
        id: "a",
        name: "Alpha",
        budget: { total: 5000, currency: "USD" },
      }),
      makeProject({
        id: "b",
        name: "Bravo",
      }),
      makeProject({
        id: "c",
        name: "Charlie",
        budget: { total: 3000, currency: "USD" },
      }),
    ])

    assert.equal(summary.totalBudget, 8000)
    assert.equal(summary.hasBudgets, true)
    assert.equal(summary.variance, null)
  })

  it("calculates variance and flags over-budget health when any project is over", () => {
    const summary = calculateClientFinancialSummary([
      makeProject({
        id: "a",
        name: "Alpha",
        servicesEstimate: 4000,
        budget: { total: 5000, currency: "USD" },
      }),
      makeProject({
        id: "b",
        name: "Bravo",
        servicesEstimate: 4500,
        budget: { total: 4000, currency: "USD" },
      }),
    ])

    assert.equal(summary.totalEstimate, 8500)
    assert.equal(summary.totalBudget, 9000)
    assert.equal(summary.variance, 500)
    assert.equal(summary.health, "over")
  })

  it("returns null health when no comparable projects exist", () => {
    const summary = calculateClientFinancialSummary([
      makeProject({
        id: "a",
        name: "Alpha",
        servicesEstimate: 1000,
      }),
      makeProject({
        id: "b",
        name: "Bravo",
        budget: { total: 2000, currency: "USD" },
      }),
    ])

    assert.equal(summary.health, null)
    assert.equal(summary.hasFinancialData, true)
  })

  it("reports no financial data for empty or bare projects", () => {
    const summary = calculateClientFinancialSummary([
      makeProject({ id: "a", name: "Alpha" }),
      makeProject({ id: "b", name: "Bravo", servicesEstimate: 0 }),
    ])

    assert.equal(summary.hasFinancialData, false)
    assert.equal(summary.totalEstimate, 0)
    assert.equal(summary.totalBudget, 0)
  })
})
