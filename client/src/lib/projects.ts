import { PROJECT_STATUSES, isProjectArchived } from "../types/project"
import type { ProjectStatus, ProjectSummary } from "../types/project"

export type ProjectSortField = "updatedAt" | "name" | "status"

export const PROJECT_SORT_LABELS: Record<ProjectSortField, string> = {
  updatedAt: "Last updated",
  name: "Name",
  status: "Status",
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
}

export const PROJECT_STATUS_ORDER: ProjectStatus[] = PROJECT_STATUSES

export function filterProjectsByName(
  projects: ProjectSummary[],
  query: string,
  clientLookup?: Map<string, { name: string; company?: string }>,
): ProjectSummary[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return projects
  }

  return projects.filter((project) => {
    const linkedClient = project.clientId
      ? clientLookup?.get(project.clientId)
      : undefined

    return (
      project.name.toLowerCase().includes(normalized) ||
      (project.client?.toLowerCase().includes(normalized) ?? false) ||
      (linkedClient?.name.toLowerCase().includes(normalized) ?? false) ||
      (linkedClient?.company?.toLowerCase().includes(normalized) ?? false)
    )
  })
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
          PROJECT_STATUS_ORDER.indexOf(a.status) -
          PROJECT_STATUS_ORDER.indexOf(b.status)
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
): Record<ProjectStatus, number> {
  return projects.reduce(
    (counts, project) => {
      counts[project.status] += 1
      return counts
    },
    {
      active: 0,
      on_hold: 0,
      completed: 0,
    } satisfies Record<ProjectStatus, number>,
  )
}

export function totalOpenComments(projects: ProjectSummary[]): number {
  return projects.reduce((total, project) => total + project.openCommentCount, 0)
}

export function countDeliverablesInReview(projects: ProjectSummary[]): number {
  return projects.reduce(
    (total, project) => total + project.deliverableStatusCounts.in_review,
    0,
  )
}

export function recentlyUpdatedProjects(
  projects: ProjectSummary[],
  limit = 5,
): ProjectSummary[] {
  return sortProjects(projects, "updatedAt").slice(0, limit)
}

export type DashboardProjectFilter =
  | { type: "open_comments" }
  | { type: "status"; status: ProjectStatus }
  | { type: "archived" }

const DASHBOARD_FILTER_PARAM = "filter"

function isProjectStatusValue(value: string): value is ProjectStatus {
  return (PROJECT_STATUS_ORDER as string[]).includes(value)
}

export function parseDashboardFilter(
  value: string | null,
): DashboardProjectFilter | null {
  if (!value) {
    return null
  }

  if (value === "open_comments") {
    return { type: "open_comments" }
  }

  if (value === "archived") {
    return { type: "archived" }
  }

  if (isProjectStatusValue(value)) {
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

  if (filter.type === "open_comments") {
    return "open_comments"
  }

  if (filter.type === "archived") {
    return "archived"
  }

  return filter.status
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

  if (filter.type === "archived") {
    return "archived projects"
  }

  return `${PROJECT_STATUS_LABELS[filter.status].toLowerCase()} projects`
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

  if (filter.type === "archived") {
    return projects.filter((project) => isProjectArchived(project))
  }

  return projects.filter((project) => project.status === filter.status)
}

export { DASHBOARD_FILTER_PARAM, isProjectArchived }
