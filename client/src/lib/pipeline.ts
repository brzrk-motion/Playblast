import { clientCompanyLabel } from "@/lib/clients"
import type { Client } from "@/types/client"
import type { ProjectSummary } from "@/types/project"

export type PipelineStatus =
  | "in_progress"
  | "pending_review"
  | "approved"
  | "completed"

export const PIPELINE_STATUSES: PipelineStatus[] = [
  "in_progress",
  "pending_review",
  "approved",
  "completed",
]

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  in_progress: "In Progress",
  pending_review: "Pending Review",
  approved: "Approved",
  completed: "Completed",
}

export const PIPELINE_STATUS_STYLES: Record<PipelineStatus, string> = {
  in_progress: "status-pending",
  pending_review: "status-warning",
  approved: "status-success",
  completed: "status-pending",
}

/** Revenue pipeline stage derived from project + deliverable rollup. */
export function derivePipelineStatus(project: ProjectSummary): PipelineStatus {
  if (project.status === "completed") {
    return "completed"
  }

  const counts = project.deliverableStatusCounts

  if (counts.in_review > 0) {
    return "pending_review"
  }

  if (
    project.deliverableCount > 0 &&
    counts.approved === project.deliverableCount
  ) {
    return "approved"
  }

  return "in_progress"
}

/** Estimated value from attached services (sum of line totals). */
export function projectEstimatedValue(project: ProjectSummary): number {
  return project.servicesEstimate ?? 0
}

export function projectClientDisplayName(
  project: ProjectSummary,
  clientLookup?: Map<string, Client>,
): string | undefined {
  if (project.clientName?.trim()) {
    return project.clientName.trim()
  }

  if (project.clientId && clientLookup) {
    const client = clientLookup.get(project.clientId)
    if (client) {
      return clientCompanyLabel(client)
    }
  }

  const legacy = project.client?.trim()
  return legacy || undefined
}

export function filterPipelineProjects(
  projects: ProjectSummary[],
  clientId: string | null,
): ProjectSummary[] {
  if (!clientId) {
    return projects
  }

  return projects.filter((project) => project.clientId === clientId)
}

export function groupProjectsByPipelineStatus(
  projects: ProjectSummary[],
): Record<PipelineStatus, ProjectSummary[]> {
  const groups = Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, [] as ProjectSummary[]]),
  ) as Record<PipelineStatus, ProjectSummary[]>

  for (const project of projects) {
    groups[derivePipelineStatus(project)].push(project)
  }

  for (const status of PIPELINE_STATUSES) {
    groups[status].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
  }

  return groups
}

export interface PipelineColumnSummary {
  count: number
  totalValue: number
}

export function summarizePipelineColumn(
  projects: ProjectSummary[],
): PipelineColumnSummary {
  return {
    count: projects.length,
    totalValue: projects.reduce(
      (sum, project) => sum + projectEstimatedValue(project),
      0,
    ),
  }
}

export interface PipelineRevenueTotals {
  won: number
  inFlight: number
}

export function calculatePipelineRevenueTotals(
  projects: ProjectSummary[],
): PipelineRevenueTotals {
  let won = 0
  let inFlight = 0

  for (const project of projects) {
    const value = projectEstimatedValue(project)
    const status = derivePipelineStatus(project)

    if (status === "approved" || status === "completed") {
      won += value
    } else {
      inFlight += value
    }
  }

  return { won, inFlight }
}
