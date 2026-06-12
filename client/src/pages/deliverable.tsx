import { useCallback, useEffect, useState } from "react"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { VersionCard } from "@/components/project/version-card"
import { VersionSelector } from "@/components/project/version-selector"
import { VersionStatusBadge } from "@/components/project/version-status-badge"
import { VersionUpload } from "@/components/project/version-upload"
import { VideoApprovalActions } from "@/components/video/video-approval-actions"
import { VideoReview } from "@/components/video/video-review"
import {
  createComment,
  deleteComment,
  getDeliverable,
  getProject,
  listComments,
  listVersions,
  resolveComment,
  updateDeliverable,
  updateVersionStatus,
} from "@/lib/api"
import {
  humanizeApiError,
  showErrorToast,
  showSuccessToast,
  showToast,
} from "@/lib/toast"
import { sortVersionsByDate, VERSION_STATUS_LABELS } from "@/lib/versions"
import type { Comment } from "@/types/comment"
import type { Deliverable, DeliverableStatus } from "@/types/deliverable"
import type { Project } from "@/types/project"
import type { Version, VersionStatus } from "@/types/version"
import { ArrowLeft, ChevronDown, Film, GitCompare, Link2, Upload } from "lucide-react"
import { useProjectPageHeader } from "@/hooks/use-project-page-header"
import { cn } from "@/lib/utils"

function deliverableStatusForVersion(
  status: VersionStatus,
): DeliverableStatus | null {
  if (status === "approved") return "approved"
  if (status === "needs_revision") return "in_review"
  return null
}

export function DeliverablePage() {
  const { projectId = "", deliverableId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const versionFromUrl = searchParams.get("version")
  const [project, setProject] = useState<Project | null>(null)
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLabel, setCommentsLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [resolvingCommentId, setResolvingCommentId] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)

  const dismissOpenPanels = useCallback(() => {
    if (uploadOpen) {
      setUploadOpen(false)
      return
    }

    if (versionsOpen) {
      setVersionsOpen(false)
    }
  }, [uploadOpen, versionsOpen])

  useEscapeKey(dismissOpenPanels, !focusMode && (uploadOpen || versionsOpen))
  useProjectPageHeader(projectId, project)

  const loadData = useCallback(async () => {
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
      setSelectedLabel((current) => {
        if (
          versionFromUrl &&
          sortedVersions.some((version) => version.label === versionFromUrl)
        ) {
          return versionFromUrl
        }

        if (current && sortedVersions.some((version) => version.label === current)) {
          return current
        }

        return sortedVersions[0]?.label ?? null
      })
      setError(null)
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load deliverable")
      setError(message)
      showErrorToast(message)
      setProject(null)
      setDeliverable(null)
      setVersions([])
      setSelectedLabel(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, deliverableId, versionFromUrl])

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

        if (cancelled) return

        const sortedVersions = sortVersionsByDate(versionData)
        setProject(projectData)
        setDeliverable(deliverableData)
        setVersions(sortedVersions)
        setSelectedLabel((current) => {
          if (
            versionFromUrl &&
            sortedVersions.some((version) => version.label === versionFromUrl)
          ) {
            return versionFromUrl
          }

          if (current && sortedVersions.some((version) => version.label === current)) {
            return current
          }

          return sortedVersions[0]?.label ?? null
        })
        setError(null)
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load deliverable")
          setError(message)
          showErrorToast(message)
          setProject(null)
          setDeliverable(null)
          setVersions([])
          setSelectedLabel(null)
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
  }, [projectId, deliverableId, versionFromUrl])

  const selectedVersion =
    versions.find((version) => version.label === selectedLabel) ?? null

  async function handleResolveComment(commentId: string, resolved: boolean) {
    setResolvingCommentId(commentId)
    setActionError(null)

    try {
      const updated = await resolveComment(commentId, resolved)
      setComments((current) =>
        current.map((comment) => (comment.id === updated.id ? updated : comment)),
      )
      showSuccessToast(resolved ? "Comment resolved" : "Comment reopened")
    } catch (err) {
      const message = humanizeApiError(err, "Failed to update comment")
      setActionError(message)
      showErrorToast(message)
    } finally {
      setResolvingCommentId(null)
    }
  }

  async function handleDeleteComment(commentId: string) {
    setDeletingCommentId(commentId)
    setActionError(null)

    try {
      await deleteComment(commentId)
      setComments((current) => current.filter((comment) => comment.id !== commentId))
      showSuccessToast("Comment deleted")
    } catch (err) {
      const message = humanizeApiError(err, "Failed to delete comment")
      setActionError(message)
      showErrorToast(message)
    } finally {
      setDeletingCommentId(null)
    }
  }

  async function handleStatusChange(versionId: string, status: VersionStatus) {
    setUpdatingStatusId(versionId)
    setActionError(null)

    try {
      const updated = await updateVersionStatus(versionId, status)
      const nextVersions = versions.map((version) =>
        version.id === updated.id ? updated : version,
      )
      setVersions(nextVersions)

      if (status === "approved") {
        showSuccessToast("Version approved")
      } else if (status === "needs_revision") {
        showSuccessToast("Needs revision")
      } else {
        showSuccessToast(VERSION_STATUS_LABELS[status])
      }

      // Roll the deliverable status up from the latest version's approval state.
      const latest = sortVersionsByDate(nextVersions)[0]
      const rollup = deliverableStatusForVersion(status)
      if (
        deliverable &&
        latest?.id === updated.id &&
        rollup &&
        deliverable.status !== rollup
      ) {
        try {
          const updatedDeliverable = await updateDeliverable(deliverable.id, {
            status: rollup,
          })
          setDeliverable(updatedDeliverable)
        } catch {
          // Non-fatal: keep the version status change even if rollup fails.
        }
      }
    } catch (err) {
      const message = humanizeApiError(err, "Failed to update version status")
      setActionError(message)
      showErrorToast(message)
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function handleCopyLink() {
    const url = new URL(window.location.href)
    if (selectedLabel) {
      url.searchParams.set("version", selectedLabel)
    }

    try {
      await navigator.clipboard.writeText(url.toString())
      showToast("Link copied")
    } catch {
      showErrorToast("Couldn't copy link")
    }
  }

  useEffect(() => {
    if (!deliverableId || !selectedLabel) {
      return
    }

    const activeDeliverableId = deliverableId
    const versionLabel = selectedLabel
    let cancelled = false

    async function fetchComments() {
      setCommentsLoading(true)

      try {
        const data = await listComments(activeDeliverableId, versionLabel)
        if (!cancelled) {
          setComments(data)
          setCommentsLabel(versionLabel)
        }
      } catch (err) {
        if (!cancelled) {
          setComments([])
          setCommentsLabel(versionLabel)
          const message = humanizeApiError(err, "Failed to load comments")
          setActionError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setCommentsLoading(false)
        }
      }
    }

    void fetchComments()

    return () => {
      cancelled = true
    }
  }, [deliverableId, selectedLabel])

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </div>
    )
  }

  if (error || !project || !deliverable) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to={`/projects/${projectId}`}>
            <ArrowLeft />
            Back to project
          </Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Deliverable unavailable</CardTitle>
            <CardDescription className="text-destructive">
              {error ?? "Deliverable not found."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true)
                setError(null)
                void loadData()
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {actionError && !focusMode ? (
        <Card className="mb-2 shrink-0 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4 py-2">
            <p className="text-sm text-destructive">{actionError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionError(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!focusMode ? (
        <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 shadow-sm">
          <Button variant="ghost" size="icon-sm" className="shrink-0" asChild>
            <Link to={`/projects/${project.id}`} aria-label="Back to project">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div className="hidden h-4 w-px bg-border sm:block" />

          <h2 className="max-w-[10rem] truncate text-sm font-semibold sm:max-w-[16rem]">
            {deliverable.name}
          </h2>

          <VersionSelector
            versions={versions}
            selectedLabel={selectedLabel}
            onSelect={setSelectedLabel}
            compact
          />

          {selectedVersion ? (
            <VersionStatusBadge status={selectedVersion.status} />
          ) : null}

          {selectedVersion ? (
            <VideoApprovalActions
              onMarkNeedsRevision={() =>
                void handleStatusChange(selectedVersion.id, "needs_revision")
              }
              onMarkApproved={() =>
                void handleStatusChange(selectedVersion.id, "approved")
              }
              approveConfirmOpen={approveConfirmOpen}
              onApproveConfirmOpenChange={setApproveConfirmOpen}
              statusUpdating={updatingStatusId === selectedVersion.id}
              className="ml-auto"
            />
          ) : null}

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleCopyLink()}
              aria-label="Copy link to clipboard"
            >
              <Link2 className="size-4" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>

            {versions.length >= 2 ? (
              <Button variant="ghost" size="sm" asChild>
                <Link
                  to={`/projects/${project.id}/deliverables/${deliverable.id}/compare?left=${encodeURIComponent(selectedLabel ?? versions[0]?.label ?? "")}&right=${encodeURIComponent(versions.find((version) => version.label !== selectedLabel)?.label ?? versions[1]?.label ?? "")}`}
                >
                  <GitCompare className="size-4" />
                  <span className="hidden sm:inline">Compare</span>
                </Link>
              </Button>
            ) : null}

            <Collapsible open={uploadOpen} onOpenChange={setUploadOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Upload className="size-4" />
                  <span className="hidden sm:inline">Upload</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      uploadOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            {versions.length > 1 ? (
              <Collapsible open={versionsOpen} onOpenChange={setVersionsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Film className="size-4" />
                    <span className="hidden sm:inline">
                      {versions.length} versions
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform",
                        versionsOpen && "rotate-180",
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            ) : null}
          </div>
        </div>
      ) : null}

      {!focusMode && uploadOpen ? (
        <div className="mb-2 shrink-0">
          <VersionUpload
            deliverableId={deliverable.id}
            versions={versions}
            onUploaded={() => void loadData()}
            onSelectVersion={setSelectedLabel}
          />
        </div>
      ) : null}

      {!focusMode && versionsOpen && versions.length > 1 ? (
        <div className="mb-2 shrink-0">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {versions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                selected={version.label === selectedLabel}
                onSelect={setSelectedLabel}
                onStatusChange={(versionId, status) =>
                  void handleStatusChange(versionId, status)
                }
                updating={updatingStatusId === version.id}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {selectedVersion ? (
          <VideoReview
            key={`${selectedVersion.id}-${selectedVersion.uploadedAt}`}
            projectId={project.id}
            deliverableId={deliverable.id}
            version={selectedVersion.label}
            filename={selectedVersion.filename}
            comments={
              selectedLabel && commentsLabel === selectedLabel ? comments : []
            }
            commentsLoading={commentsLoading}
            onCreateComment={async (input) => {
              try {
                const comment = await createComment({
                  versionId: selectedVersion.id,
                  ...input,
                })
                setComments((current) =>
                  [...current, comment].sort((a, b) => a.timestamp - b.timestamp),
                )
                showSuccessToast("Comment posted")
              } catch (err) {
                const message = humanizeApiError(err, "Failed to post comment")
                showErrorToast(message)
                throw err
              }
            }}
            onResolveComment={handleResolveComment}
            onDeleteComment={handleDeleteComment}
            deletingCommentId={deletingCommentId}
            onMarkNeedsRevision={() =>
              void handleStatusChange(selectedVersion.id, "needs_revision")
            }
            onRequestApproveConfirm={() => setApproveConfirmOpen(true)}
            versionStatus={selectedVersion.status}
            statusUpdating={updatingStatusId === selectedVersion.id}
            resolvingCommentId={resolvingCommentId}
            focusMode={focusMode}
            onFocusModeChange={setFocusMode}
          />
        ) : (
          <Card className="flex flex-1 items-center justify-center border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Film className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No versions yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload your first video to start reviewing this deliverable.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(true)}
              >
                <Upload />
                Upload video
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
