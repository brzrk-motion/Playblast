import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/feedback/empty-state"
import { PageError } from "@/components/feedback/page-error"
import { PageLoading } from "@/components/feedback/page-loading"
import { SyncedVideoComparison } from "@/components/video/synced-video-comparison"
import { getDeliverable, getProject, listVersions, redirectOnSessionExpired } from "@/lib/api"
import {
  resolveAsyncViewState,
  reviewEmptyCopy,
  reviewErrorTitle,
} from "@/lib/review-feedback"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { pickCompareVersionLabels, sortVersionsByDate } from "@/lib/versions"
import type { Deliverable } from "@/types/deliverable"
import type { ProjectDetail } from "@/types/project"
import type { Version } from "@/types/version"
import { useProjectPageHeader } from "@/hooks/use-project-page-header"
import { ArrowLeft, GitCompare } from "lucide-react"

export function ComparePage() {
  const { projectId = "", deliverableId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useProjectPageHeader(projectId, project)

  const { left: leftLabel, right: rightLabel } = useMemo(
    () =>
      pickCompareVersionLabels(
        versions,
        searchParams.get("left"),
        searchParams.get("right"),
      ),
    [versions, searchParams],
  )

  const loadProjectData = useCallback(async () => {
    if (!projectId || !deliverableId) {
      return
    }

    try {
      const [projectData, deliverableData, versionData] = await Promise.all([
        getProject(projectId),
        getDeliverable(deliverableId),
        listVersions(deliverableId),
      ])

      const sortedVersions = sortVersionsByDate(versionData)

      setProject(projectData)
      setDeliverable(deliverableData)
      setVersions(sortedVersions)
      setError(null)
    } catch (err) {
      if (redirectOnSessionExpired(err)) {
        return
      }
      const message = humanizeApiError(err, "Failed to load deliverable")
      setError(message)
      showErrorToast(message)
      setProject(null)
      setDeliverable(null)
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [projectId, deliverableId])

  useEffect(() => {
    if (!projectId || !deliverableId) return

    let cancelled = false

    async function fetchData() {
      try {
        const [projectData, deliverableData, versionData] = await Promise.all([
          getProject(projectId),
          getDeliverable(deliverableId),
          listVersions(deliverableId),
        ])
        if (!cancelled) {
          setProject(projectData)
          setDeliverable(deliverableData)
          setVersions(sortVersionsByDate(versionData))
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          if (redirectOnSessionExpired(err)) {
            return
          }
          const message = humanizeApiError(err, "Failed to load deliverable")
          setError(message)
          showErrorToast(message)
          setProject(null)
          setDeliverable(null)
          setVersions([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [projectId, deliverableId])

  const updateSearchParam = useCallback(
    (pane: "left" | "right", label: string) => {
      const otherPane = pane === "left" ? "right" : "left"
      const previousLabel = pane === "left" ? leftLabel : rightLabel

      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set(pane, label)
          // Keep the two panes on different versions: if the chosen version is
          // already shown in the other pane, swap them instead of duplicating.
          if (next.get(otherPane) === label && previousLabel) {
            next.set(otherPane, previousLabel)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams, leftLabel, rightLabel],
  )

  const handleLeftLabelChange = useCallback(
    (label: string) => {
      updateSearchParam("left", label)
    },
    [updateSearchParam],
  )

  const handleRightLabelChange = useCallback(
    (label: string) => {
      updateSearchParam("right", label)
    },
    [updateSearchParam],
  )

  if (loading) {
    return (
      <PageLoading className="space-y-6" label="Loading comparison…">
        <Skeleton className="h-8 w-48" aria-hidden />
        <Skeleton className="aspect-video w-full rounded-xl" aria-hidden />
        <Skeleton className="aspect-video w-full rounded-xl" aria-hidden />
      </PageLoading>
    )
  }

  if (error || !project || !deliverable) {
    const viewState = resolveAsyncViewState({
      loading: false,
      error,
      missing: !project || !deliverable,
      surface: "compare",
    })
    const message =
      viewState.status === "error" ? viewState.message : "Deliverable not found."

    return (
      <PageError
        title={reviewErrorTitle("compare")}
        message={message}
        backLink={{ to: `/projects/${projectId}`, label: "Back to project" }}
        onRetry={() => {
          setLoading(true)
          setError(null)
          void loadProjectData()
        }}
      />
    )
  }

  const deliverableHref = `/projects/${project.id}/deliverables/${deliverable.id}`
  const emptyCompare = reviewEmptyCopy("need_two_versions")

  if (versions.length < 2) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to={deliverableHref}>
            <ArrowLeft />
            Back to deliverable
          </Link>
        </Button>
        <EmptyState
          icon={<GitCompare className="size-10" />}
          title={emptyCompare.title}
          description={emptyCompare.description}
          action={
            <Button asChild>
              <Link to={deliverableHref}>Go to deliverable</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to={deliverableHref}>
            <ArrowLeft />
            Back to deliverable
          </Link>
        </Button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="type-page-title">{deliverable.name}</h2>
            <Badge variant="secondary">Version comparison</Badge>
          </div>
          <p className="text-muted-foreground">
            Compare two versions with synced playback and scrubbing.
          </p>
        </div>
      </div>

      <SyncedVideoComparison
        projectId={project.id}
        deliverableId={deliverable.id}
        versions={versions}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        onLeftLabelChange={handleLeftLabelChange}
        onRightLabelChange={handleRightLabelChange}
      />
    </div>
  )
}
