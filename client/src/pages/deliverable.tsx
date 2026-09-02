import { useCallback, useEffect, useState } from "react"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { ActionErrorBanner } from "@/components/feedback/action-error-banner"
import { EmptyState } from "@/components/feedback/empty-state"
import { PageError } from "@/components/feedback/page-error"
import { PageLoading } from "@/components/feedback/page-loading"
import { VersionCard } from "@/components/project/version-card"
import { VersionSelector } from "@/components/project/version-selector"
import { VersionStatusBadge } from "@/components/project/version-status-badge"
import { VersionUpload } from "@/components/project/version-upload"
import { VideoApprovalActions } from "@/components/video/video-approval-actions"
import { VersionDownloadButton } from "@/components/video/version-download-button"
import { VideoReview } from "@/components/video/video-review"
import {
  createComment,
  deleteComment,
  getDeliverable,
  getProject,
  listComments,
  listVersions,
  redirectOnSessionExpired,
  getForbiddenMessage,
  resolveComment,
  updateDeliverable,
  updateVersionStatus,
} from "@/lib/api"
import {
  resolveAsyncViewState,
  reviewEmptyCopy,
  reviewErrorTitle,
} from "@/lib/review-feedback"
import {
  humanizeApiError,
  showErrorToast,
  showSuccessToast,
  showToast,
} from "@/lib/toast"
import { sortVersionsByDate, VERSION_STATUS_LABELS } from "@/lib/versions"
import type { Comment } from "@/types/comment"
import type { Deliverable, DeliverableStatus } from "@/types/deliverable"
import type { ProjectDetail } from "@/types/project"
import type { Version, VersionStatus } from "@/types/version"
import { ArrowLeft, ChevronDown, Film, GitCompare, Link2, Upload } from "lucide-react"
import { useProjectPageHeader } from "@/hooks/use-project-page-header"
import { useCapability } from "@/hooks/use-capability"
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
  const [project, setProject] = useState<ProjectDetail | null>(null)
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
  const canUpload = useCapability("media.upload")
  const canApprove = useCapability("approval.mutate")
  const canDownload = useCapability("downloads.read")
  const canCompare = useCapability("review.compare")
  const canComment = useCapability("comments.create")

  function handleProofingError(err: unknown, fallback: string): string {
    if (redirectOnSessionExpired(err)) {
      return ""
    }

    return getForbiddenMessage(err) ?? humanizeApiError(err, fallback)
  }

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
      const message = handleProofingError(err, "Failed to load deliverable")
      if (!message) return
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
          const message = handleProofingError(err, "Failed to load deliverable")
          if (!message) return
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
      const message = handleProofingError(err, "Failed to update comment")
      if (!message) return
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
      const message = handleProofingError(err, "Failed to delete comment")
      if (!message) return
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
      const message = handleProofingError(err, "Failed to update version status")
      if (!message) return
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
          const message = handleProofingError(err, "Failed to load comments")
          if (!message) return
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
      <PageLoading
        className="flex min-h-0 flex-1 flex-col gap-3"
        label="Loading deliverable…"
      >
        <Skeleton className="h-10 w-full" aria-hidden />
        <Skeleton className="min-h-0 flex-1 rounded-xl" aria-hidden />
      </PageLoading>
    )
  }

  if (error || !project || !deliverable) {
    const viewState = resolveAsyncViewState({
      loading: false,
      error,
      missing: !project || !deliverable,
      surface: "deliverable",
    })
    const message =
      viewState.status === "error" ? viewState.message : "Deliverable not found."

    return (
      <PageError
        title={reviewErrorTitle("deliverable")}
        message={message}
        backLink={{ to: `/projects/${projectId}`, label: "Back to project" }}
        onRetry={() => {
          setLoading(true)
          setError(null)
          void loadData()
        }}
      />
    )
  }

  const emptyVersions = reviewEmptyCopy("no_versions")

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {actionError && !focusMode ? (
        <ActionErrorBanner
          className="mb-2"
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
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

          {selectedVersion && canApprove ? (
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
            {selectedVersion && canDownload ? (
              <VersionDownloadButton versionId={selectedVersion.id} />
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleCopyLink()}
              aria-label="Copy link to clipboard"
            >
              <Link2 className="size-4" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>

            {versions.length >= 2 && canCompare ? (
              <Button variant="ghost" size="sm" asChild>
                <Link
                  to={`/projects/${project.id}/deliverables/${deliverable.id}/compare?left=${encodeURIComponent(selectedLabel ?? versions[0]?.label ?? "")}&right=${encodeURIComponent(versions.find((version) => version.label !== selectedLabel)?.label ?? versions[1]?.label ?? "")}`}
                >
                  <GitCompare className="size-4" />
                  <span className="hidden sm:inline">Compare</span>
                </Link>
              </Button>
            ) : null}

            {canUpload ? (
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
            ) : null}

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

      {!focusMode && uploadOpen && canUpload ? (
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
                canChangeStatus={canApprove}
                updating={updatingStatusId === version.id}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 w-full flex-1 flex-col">
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
            onCreateComment={
              canComment
                ? async (input) => {
                    try {
                      const comment = await createComment({
                        versionId: selectedVersion.id,
                        timestamp: input.timestamp,
                        body: input.body,
                        annotation: input.annotation,
                      })
                      setComments((current) =>
                        [...current, comment].sort(
                          (a, b) => a.timestamp - b.timestamp,
                        ),
                      )
                      showSuccessToast("Comment posted")
                    } catch (err) {
                      const message = handleProofingError(err, "Failed to post comment")
                      if (!message) return
                      showErrorToast(message)
                      throw err
                    }
                  }
                : undefined
            }
            onResolveComment={canApprove ? handleResolveComment : undefined}
            onDeleteComment={canComment ? handleDeleteComment : undefined}
            deletingCommentId={deletingCommentId}
            onMarkNeedsRevision={
              canApprove
                ? () => void handleStatusChange(selectedVersion.id, "needs_revision")
                : undefined
            }
            onRequestApproveConfirm={
              canApprove ? () => setApproveConfirmOpen(true) : undefined
            }
            versionStatus={selectedVersion.status}
            statusUpdating={updatingStatusId === selectedVersion.id}
            resolvingCommentId={resolvingCommentId}
            focusMode={focusMode}
            onFocusModeChange={setFocusMode}
          />
        ) : (
          <EmptyState
            className="flex flex-1 justify-center"
            icon={<Film className="size-10" />}
            title={emptyVersions.title}
            description={emptyVersions.description}
            action={
              canUpload ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(true)}
              >
                <Upload />
                Upload video
              </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  )
}
