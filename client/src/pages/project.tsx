import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { VersionSelector } from "@/components/project/version-selector"
import { VersionUpload } from "@/components/project/version-upload"
import { VideoReview } from "@/components/video/video-review"
import {
  createComment,
  getProject,
  listComments,
  listVersions,
} from "@/lib/api"
import { sortVersionsByDate } from "@/lib/versions"
import type { Comment } from "@/types/comment"
import type { Project } from "@/types/project"
import type { Version } from "@/types/version"
import { ArrowLeft, Film } from "lucide-react"

export function ProjectPage() {
  const { projectId = "" } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setSelectedLabel((current) => {
        if (current && sortedVersions.some((version) => version.label === current)) {
          return current
        }

        return sortedVersions[0]?.label ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project")
      setProject(null)
      setVersions([])
      setSelectedLabel(null)
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
        setSelectedLabel((current) => {
          if (current && sortedVersions.some((version) => version.label === current)) {
            return current
          }

          return sortedVersions[0]?.label ?? null
        })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load project")
          setProject(null)
          setVersions([])
          setSelectedLabel(null)
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

  const selectedVersion =
    versions.find((version) => version.label === selectedLabel) ?? null

  useEffect(() => {
    if (!projectId || !selectedLabel) {
      return
    }

    const activeProjectId = projectId
    const versionLabel = selectedLabel
    let cancelled = false

    async function fetchComments() {
      try {
        const data = await listComments(activeProjectId, versionLabel)
        if (!cancelled) {
          setComments(data)
        }
      } catch {
        if (!cancelled) {
          setComments([])
        }
      }
    }

    void fetchComments()

    return () => {
      cancelled = true
    }
  }, [projectId, selectedLabel])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
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
            <CardTitle>Project unavailable</CardTitle>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/">
              <ArrowLeft />
              Dashboard
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
              <Badge variant="secondary">
                {versions.length} {versions.length === 1 ? "version" : "versions"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Upload new renders and switch between versions for review.
            </p>
          </div>
        </div>

        <VersionSelector
          versions={versions}
          selectedLabel={selectedLabel}
          onSelect={setSelectedLabel}
        />
      </div>

      {selectedVersion ? (
        <VideoReview
          key={`${selectedVersion.id}-${selectedVersion.uploadedAt}`}
          projectId={project.id}
          version={selectedVersion.label}
          filename={selectedVersion.filename}
          title={selectedVersion.filename}
          comments={selectedLabel ? comments : []}
          onCreateComment={async (input) => {
            const comment = await createComment({
              versionId: selectedVersion.id,
              ...input,
            })
            setComments((current) =>
              [...current, comment].sort((a, b) => a.timestamp - b.timestamp),
            )
          }}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Film className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No versions yet</p>
              <p className="text-sm text-muted-foreground">
                Upload your first video to start reviewing this project.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <VersionUpload
        projectId={project.id}
        versions={versions}
        onUploaded={() => void loadProjectData()}
        onSelectVersion={setSelectedLabel}
      />
    </div>
  )
}
