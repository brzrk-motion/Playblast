import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildMonthlyRevenueBuckets } from "./monthly-revenue.js"
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

const referenceDate = new Date("2026-06-15T12:00:00.000Z")

describe("buildMonthlyRevenueBuckets", () => {
  it("returns twelve months for the reference year with zero defaults", () => {
    const buckets = buildMonthlyRevenueBuckets([], "startDate", referenceDate)

    assert.equal(buckets.length, 12)
    assert.equal(buckets[0]?.monthLabel, "Jan")
    assert.equal(buckets[5]?.monthLabel, "Jun")
    assert.equal(buckets[5]?.isCurrentMonth, true)
    assert.equal(buckets[4]?.isCurrentMonth, false)
    assert.equal(
      buckets.every((bucket) => bucket.projectCount === 0 && bucket.totalValue === 0),
      true,
    )
  })

  it("groups projects by start date and sums estimated value", () => {
    const projects = [
      makeProject({
        id: "p1",
        name: "Alpha",
        startDate: "2026-03-10",
        servicesEstimate: 1000,
      }),
      makeProject({
        id: "p2",
        name: "Beta",
        startDate: "2026-03-22",
        servicesEstimate: 2500,
      }),
      makeProject({
        id: "p3",
        name: "Gamma",
        startDate: "2026-07-01",
        servicesEstimate: 500,
      }),
    ]

    const buckets = buildMonthlyRevenueBuckets(projects, "startDate", referenceDate)

    assert.equal(buckets[2]?.projectCount, 2)
    assert.equal(buckets[2]?.totalValue, 3500)
    assert.equal(buckets[6]?.projectCount, 1)
    assert.equal(buckets[6]?.totalValue, 500)
    assert.equal(buckets[0]?.totalValue, 0)
  })

  it("groups projects by end date when toggled", () => {
    const projects = [
      makeProject({
        id: "p1",
        name: "Alpha",
        startDate: "2026-01-05",
        endDate: "2026-04-18",
        servicesEstimate: 800,
      }),
      makeProject({
        id: "p2",
        name: "Beta",
        startDate: "2026-02-01",
        endDate: "2026-04-30",
        servicesEstimate: 1200,
      }),
    ]

    const buckets = buildMonthlyRevenueBuckets(projects, "endDate", referenceDate)

    assert.equal(buckets[0]?.projectCount, 0)
    assert.equal(buckets[3]?.projectCount, 2)
    assert.equal(buckets[3]?.totalValue, 2000)
  })

  it("ignores projects without the selected date or outside the year", () => {
    const projects = [
      makeProject({
        id: "p1",
        name: "No date",
        servicesEstimate: 900,
      }),
      makeProject({
        id: "p2",
        name: "Last year",
        startDate: "2025-12-31",
        servicesEstimate: 400,
      }),
      makeProject({
        id: "p3",
        name: "Next year",
        startDate: "2027-01-01",
        servicesEstimate: 300,
      }),
    ]

    const buckets = buildMonthlyRevenueBuckets(projects, "startDate", referenceDate)

    assert.equal(
      buckets.every((bucket) => bucket.projectCount === 0 && bucket.totalValue === 0),
      true,
    )
  })
})
