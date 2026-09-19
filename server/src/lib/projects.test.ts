import assert from "node:assert/strict"
import { test } from "node:test"

import {
  CLIENT_FILTER_PARAM,
  dashboardFilterToParam,
  filterProjectsByDashboardFilter,
  parseClientFilterFromSearchParams,
  parseDashboardFilter,
} from "../../../client/src/lib/projects.ts"
import type { ProjectSummary } from "../../../client/src/types/project.ts"

function emptyStatusCounts() {
  return {
    not_started: 0,
    in_progress: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
  }
}

const projects: ProjectSummary[] = [
  {
    id: "1",
    name: "Alpha",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    deliverableCount: 1,
    versionCount: 1,
    updatedAt: "2026-03-01T00:00:00.000Z",
    openCommentCount: 2,
    deliverableStatusCounts: emptyStatusCounts(),
    nextMilestone: null,
  },
  {
    id: "2",
    name: "Beta",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "on_hold",
    deliverableCount: 1,
    versionCount: 1,
    updatedAt: "2026-02-01T00:00:00.000Z",
    openCommentCount: 0,
    deliverableStatusCounts: emptyStatusCounts(),
    nextMilestone: null,
  },
  {
    id: "3",
    name: "Gamma",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "completed",
    deliverableCount: 1,
    versionCount: 1,
    updatedAt: "2026-01-15T00:00:00.000Z",
    openCommentCount: 0,
    deliverableStatusCounts: emptyStatusCounts(),
    nextMilestone: null,
  },
]

test("parseDashboardFilter accepts open comments and project status values", () => {
  assert.deepEqual(parseDashboardFilter("open_comments"), { type: "open_comments" })
  assert.deepEqual(parseDashboardFilter("over_budget"), { type: "over_budget" })
  assert.deepEqual(parseDashboardFilter("active"), {
    type: "status",
    status: "active",
  })
  assert.deepEqual(parseDashboardFilter("archived"), { type: "archived" })
  assert.equal(parseDashboardFilter(null), null)
  assert.equal(parseDashboardFilter("invalid"), null)
})

test("dashboardFilterToParam round-trips filter values", () => {
  assert.equal(dashboardFilterToParam({ type: "open_comments" }), "open_comments")
  assert.equal(dashboardFilterToParam({ type: "over_budget" }), "over_budget")
  assert.equal(
    dashboardFilterToParam({ type: "status", status: "on_hold" }),
    "on_hold",
  )
  assert.equal(dashboardFilterToParam({ type: "archived" }), "archived")
  assert.equal(dashboardFilterToParam(null), null)
})

test("filterProjectsByDashboardFilter filters by open comments", () => {
  const filtered = filterProjectsByDashboardFilter(projects, {
    type: "open_comments",
  })

  assert.deepEqual(
    filtered.map((project) => project.id),
    ["1"],
  )
})

test("filterProjectsByDashboardFilter filters by status", () => {
  const filtered = filterProjectsByDashboardFilter(projects, {
    type: "status",
    status: "on_hold",
  })

  assert.deepEqual(
    filtered.map((project) => project.id),
    ["2"],
  )
})

test("filterProjectsByDashboardFilter filters over-budget active projects", () => {
  const financialProjects: ProjectSummary[] = [
    {
      ...projects[0],
      id: "over",
      servicesEstimate: 12_000,
      budget: { total: 10_000, currency: "USD" },
    },
    {
      ...projects[1],
      id: "under",
      servicesEstimate: 3_000,
      budget: { total: 5_000, currency: "USD" },
    },
    {
      ...projects[2],
      id: "completed-over",
      status: "completed",
      servicesEstimate: 20_000,
      budget: { total: 1_000, currency: "USD" },
    },
  ]

  const filtered = filterProjectsByDashboardFilter(financialProjects, {
    type: "over_budget",
  })

  assert.deepEqual(
    filtered.map((project) => project.id),
    ["over"],
  )
})

test("filterProjectsByDashboardFilter returns all projects when filter is null", () => {
  assert.equal(filterProjectsByDashboardFilter(projects, null).length, 3)
})

test("parseClientFilterFromSearchParams reads client query param", () => {
  const params = new URLSearchParams()
  params.set(CLIENT_FILTER_PARAM, "client-uuid")
  assert.equal(parseClientFilterFromSearchParams(params), "client-uuid")
  assert.equal(parseClientFilterFromSearchParams(new URLSearchParams()), null)
})
