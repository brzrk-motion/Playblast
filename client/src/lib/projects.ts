import { VERSION_STATUS_LABELS, VERSION_STATUS_ORDER } from "./versions"
import type { ProjectSummary } from "@/types/project"
import type { VersionStatus } from "@/types/version"

export type ProjectSortField = "updatedAt" | "name" | "status"

export const PROJECT_SORT_LABELS: Record<ProjectSortField, string> = {
  updatedAt: "Last updated",
  name: "Name",
  status: "Status",
}

export function filterProjectsByName(
  projects: ProjectSummary[],
  query: string,
): ProjectSummary[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return projects
  }

  return projects.filter((project) =>
    project.name.toLowerCase().includes(normalized),
  )
}

export function sortProjects(
  projects: ProjectSummary[],
  field: ProjectSortField,
): ProjectSummary[] {
  const sorted = [...projects]

  sorted.sort((a, b) => {
    switch (field) {
      case "name":
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      case "status": {
        const statusDelta =
          VERSION_STATUS_ORDER.indexOf(a.status) -
          VERSION_STATUS_ORDER.indexOf(b.status)
        if (statusDelta !== 0) {
          return statusDelta
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      }
      case "updatedAt":
      default:
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
    }
  })

  return sorted
}

export function countProjectsByStatus(
  projects: ProjectSummary[],
): Record<VersionStatus, number> {
  return projects.reduce(
    (counts, project) => {
      counts[project.status] += 1
      return counts
    },
    {
      pending_review: 0,
      needs_revision: 0,
      approved: 0,
    } satisfies Record<VersionStatus, number>,
  )
}

export function totalOpenComments(projects: ProjectSummary[]): number {
  return projects.reduce((total, project) => total + project.openCommentCount, 0)
}

export function recentlyUpdatedProjects(
  projects: ProjectSummary[],
  limit = 5,
): ProjectSummary[] {
  return sortProjects(projects, "updatedAt").slice(0, limit)
}

export type DashboardProjectFilter =
  | { type: "open_comments" }
  | { type: "status"; status: VersionStatus }

const DASHBOARD_FILTER_PARAM = "filter"

export function parseDashboardFilter(
  value: string | null,
): DashboardProjectFilter | null {
  if (!value) {
    return null
  }

  if (value === "open_comments") {
    return { type: "open_comments" }
  }

  if (
    value === "pending_review" ||
    value === "needs_revision" ||
    value === "approved"
  ) {
    return { type: "status", status: value }
  }

  return null
}

export function dashboardFilterToParam(
  filter: DashboardProjectFilter | null,
): string | null {
  if (!filter) {
    return null
  }

  return filter.type === "open_comments" ? "open_comments" : filter.status
}

export function parseDashboardFilterFromSearchParams(
  searchParams: URLSearchParams,
): DashboardProjectFilter | null {
  return parseDashboardFilter(searchParams.get(DASHBOARD_FILTER_PARAM))
}

export function getDashboardFilterLabel(
  filter: DashboardProjectFilter,
): string {
  if (filter.type === "open_comments") {
    return "projects with open comments"
  }

  return `${VERSION_STATUS_LABELS[filter.status].toLowerCase()} projects`
}

export function filterProjectsByDashboardFilter(
  projects: ProjectSummary[],
  filter: DashboardProjectFilter | null,
): ProjectSummary[] {
  if (!filter) {
    return projects
  }

  if (filter.type === "open_comments") {
    return projects.filter((project) => project.openCommentCount > 0)
  }

  return projects.filter((project) => project.status === filter.status)
}

export { DASHBOARD_FILTER_PARAM }
