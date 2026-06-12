import { VERSION_STATUS_ORDER } from "@/lib/versions"
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
