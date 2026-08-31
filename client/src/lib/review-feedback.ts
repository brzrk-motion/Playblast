export type ReviewSurface = "dashboard" | "project" | "deliverable" | "compare"

export type ReviewEmptyKind =
  | "no_projects"
  | "no_archived_projects"
  | "no_deliverables"
  | "no_versions"
  | "need_two_versions"

export type AsyncViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" }

const ERROR_TITLES: Record<ReviewSurface, string> = {
  dashboard: "Dashboard unavailable",
  project: "Project unavailable",
  deliverable: "Deliverable unavailable",
  compare: "Comparison unavailable",
}

const EMPTY_COPY: Record<
  ReviewEmptyKind,
  { title: string; description: string }
> = {
  no_projects: {
    title: "No projects yet",
    description: "Create your first project to start planning work.",
  },
  no_archived_projects: {
    title: "No archived projects",
    description: "Archived projects will appear here.",
  },
  no_deliverables: {
    title: "No deliverables yet",
    description: "Create a deliverable to start uploading and reviewing videos.",
  },
  no_versions: {
    title: "No versions yet",
    description: "Upload your first video to start reviewing this deliverable.",
  },
  need_two_versions: {
    title: "Need at least two versions",
    description: "Upload another render to compare versions side by side.",
  },
}

const MISSING_MESSAGES: Record<ReviewSurface, string> = {
  dashboard: "Projects could not be loaded.",
  project: "Project not found.",
  deliverable: "Deliverable not found.",
  compare: "Deliverable not found.",
}

export function reviewErrorTitle(surface: ReviewSurface): string {
  return ERROR_TITLES[surface]
}

export function reviewEmptyCopy(kind: ReviewEmptyKind): {
  title: string
  description: string
} {
  return EMPTY_COPY[kind]
}

export function reviewMissingMessage(surface: ReviewSurface): string {
  return MISSING_MESSAGES[surface]
}

/** Resolve loading / error / ready for review surfaces that gate on fetch state. */
export function resolveAsyncViewState(input: {
  loading: boolean
  error: string | null
  missing?: boolean
  surface?: ReviewSurface
}): AsyncViewState {
  if (input.loading) {
    return { status: "loading" }
  }

  if (input.error) {
    return { status: "error", message: input.error }
  }

  if (input.missing) {
    return {
      status: "error",
      message: reviewMissingMessage(input.surface ?? "project"),
    }
  }

  return { status: "ready" }
}
