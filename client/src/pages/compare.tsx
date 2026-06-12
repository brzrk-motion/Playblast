import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SyncedVideoComparison } from "@/components/video/synced-video-comparison"
import { getProject, listVersions } from "@/lib/api"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { pickCompareVersionLabels, sortVersionsByDate } from "@/lib/versions"
import type { Project } from "@/types/project"
import type { Version } from "@/types/version"
import { ArrowLeft, GitCompare } from "lucide-react"

export function ComparePage() {
  const { projectId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [project, setProject] = useState<Project | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    if (!projectId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [projectData, versionData] = await Promise.all([
        getProject(projectId),
        listVersions(projectId),
      ])

      const sortedVersions = sortVersionsByDate(versionData)

      setProject(projectData)
      setVersions(sortedVersions)
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load project")
      setError(message)
      showErrorToast(message)
      setProject(null)
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      return
    }

    let cancelled = false

    async function fetchProject() {
      setLoading(true)
      setError(null)

      try {
        const [projectData, versionData] = await Promise.all([
          getProject(projectId),
          listVersions(projectId),
        ])

        if (cancelled) {
          return
        }

        const sortedVersions = sortVersionsByDate(versionData)

        setProject(projectData)
        setVersions(sortedVersions)
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load project")
          setError(message)
          showErrorToast(message)
          setProject(null)
          setVersions([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchProject()

    return () => {
      cancelled = true
    }
  }, [projectId])

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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Comparison unavailable</CardTitle>
            <CardDescription className="text-destructive">
              {error ?? "Project not found."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void loadProjectData()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (versions.length < 2) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to={`/projects/${project.id}`}>
            <ArrowLeft />
            Back to project
          </Link>
        </Button>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <GitCompare className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Need at least two versions</p>
              <p className="text-sm text-muted-foreground">
                Upload another render to compare versions side by side.
              </p>
            </div>
            <Button asChild>
              <Link to={`/projects/${project.id}`}>Go to project</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to={`/projects/${project.id}`}>
            <ArrowLeft />
            Back to project
          </Link>
        </Button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="type-page-title">{project.name}</h2>
            <Badge variant="secondary">Version comparison</Badge>
          </div>
          <p className="text-muted-foreground">
            Compare two versions with synced playback and scrubbing.
          </p>
        </div>
      </div>

      <SyncedVideoComparison
        projectId={project.id}
        versions={versions}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        onLeftLabelChange={handleLeftLabelChange}
        onRightLabelChange={handleRightLabelChange}
      />
    </div>
  )
}
