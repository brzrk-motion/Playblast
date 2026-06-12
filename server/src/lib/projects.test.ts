import assert from "node:assert/strict"
import { test } from "node:test"

import {
  dashboardFilterToParam,
  filterProjectsByDashboardFilter,
  parseDashboardFilter,
} from "../../../client/src/lib/projects.ts"
import type { ProjectSummary } from "../../../client/src/types/project.ts"

const projects: ProjectSummary[] = [
  {
    id: "1",
    name: "Alpha",
    createdAt: "2026-01-01T00:00:00.000Z",
    versionCount: 1,
    updatedAt: "2026-03-01T00:00:00.000Z",
    openCommentCount: 2,
    status: "pending_review",
  },
  {
    id: "2",
    name: "Beta",
    createdAt: "2026-01-01T00:00:00.000Z",
    versionCount: 1,
    updatedAt: "2026-02-01T00:00:00.000Z",
    openCommentCount: 0,
    status: "needs_revision",
  },
  {
    id: "3",
    name: "Gamma",
    createdAt: "2026-01-01T00:00:00.000Z",
    versionCount: 1,
    updatedAt: "2026-01-15T00:00:00.000Z",
    openCommentCount: 0,
    status: "approved",
  },
]

test("parseDashboardFilter accepts open comments and status values", () => {
  assert.deepEqual(parseDashboardFilter("open_comments"), { type: "open_comments" })
  assert.deepEqual(parseDashboardFilter("approved"), {
    type: "status",
    status: "approved",
  })
  assert.equal(parseDashboardFilter(null), null)
  assert.equal(parseDashboardFilter("invalid"), null)
})

test("dashboardFilterToParam round-trips filter values", () => {
  assert.equal(dashboardFilterToParam({ type: "open_comments" }), "open_comments")
  assert.equal(
    dashboardFilterToParam({ type: "status", status: "needs_revision" }),
    "needs_revision",
  )
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
    status: "needs_revision",
  })

  assert.deepEqual(
    filtered.map((project) => project.id),
    ["2"],
  )
})

test("filterProjectsByDashboardFilter returns all projects when filter is null", () => {
  assert.equal(filterProjectsByDashboardFilter(projects, null).length, 3)
})
