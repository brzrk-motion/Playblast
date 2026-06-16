import assert from "node:assert/strict"
import { test } from "node:test"

import {
  dashboardFilterToParam,
  filterProjectsByDashboardFilter,
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

test("filterProjectsByDashboardFilter returns all projects when filter is null", () => {
  assert.equal(filterProjectsByDashboardFilter(projects, null).length, 3)
})
