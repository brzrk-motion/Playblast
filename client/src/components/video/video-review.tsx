import "@vidstack/react/player/styles/base.css"

import { useCallback, useRef, useState } from "react"
import {
  MediaPlayer,
  MediaProvider,
  useMediaState,
  type MediaPlayerInstance,
} from "@vidstack/react"
import { Focus, PanelRightClose, PanelRightOpen } from "lucide-react"

import { AnnotationOverlay } from "@/components/video/annotation-overlay"
import { CommentsPanel } from "@/components/video/comments-panel"
import { VersionStatusBadge } from "@/components/project/version-status-badge"
import { VideoControls } from "@/components/video/video-controls"
import { VideoHotkeys } from "@/components/video/video-hotkeys"
import { VideoLoadingOverlay } from "@/components/video/video-loading-overlay"
import { Button } from "@/components/ui/button"
import { VideoPlayerProvider } from "@/context/video-player-provider"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { getVideoUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { FrameAnnotation } from "@/types/annotation"
import type { Comment } from "@/types/comment"
import type { VersionStatus } from "@/types/version"

export interface VideoReviewProps {
  projectId: string
  deliverableId: string
  version: string
  filename: string
  title?: string
  comments: Comment[]
  commentsLoading?: boolean
  onCreateComment?: (input: {
    timestamp: number
    body: string
    annotation?: FrameAnnotation
  }) => Promise<void>
  onResolveComment?: (commentId: string, resolved: boolean) => Promise<void>
  onDeleteComment?: (commentId: string) => Promise<void>
  onMarkNeedsRevision?: () => void
  onRequestApproveConfirm?: () => void
  versionStatus?: VersionStatus
  resolvingCommentId?: string | null
  deletingCommentId?: string | null
  statusUpdating?: boolean
  className?: string
  commentsPanelOpen?: boolean
  onCommentsPanelOpenChange?: (open: boolean) => void
  focusMode?: boolean
  onFocusModeChange?: (focus: boolean) => void
}

type VideoReviewLayoutProps = VideoReviewProps

function VideoReviewLayout({
  version,
  filename,
  title,
  comments,
  commentsLoading = false,
  onCreateComment,
  onResolveComment,
  onDeleteComment,
  onMarkNeedsRevision,
  onRequestApproveConfirm,
  versionStatus,
  resolvingCommentId = null,
  deletingCommentId = null,
  statusUpdating = false,
  className,
  commentsPanelOpen: commentsPanelOpenProp,
  onCommentsPanelOpenChange,
  focusMode: focusModeProp,
  onFocusModeChange,
}: VideoReviewLayoutProps) {
  const [commentsPanelOpenInternal, setCommentsPanelOpenInternal] = useState(true)
  const [focusModeInternal, setFocusModeInternal] = useState(false)
  const isFullscreen = useMediaState("fullscreen")
  const { composer } = useVideoPlayer()

  const commentsPanelOpen = commentsPanelOpenProp ?? commentsPanelOpenInternal
  const focusMode = focusModeProp ?? focusModeInternal

  const setCommentsPanelOpen = useCallback(
    (open: boolean) => {
      if (onCommentsPanelOpenChange) {
        onCommentsPanelOpenChange(open)
      } else {
        setCommentsPanelOpenInternal(open)
      }
    },
    [onCommentsPanelOpenChange],
  )

  const setFocusMode = useCallback(
    (focus: boolean) => {
      if (onFocusModeChange) {
        onFocusModeChange(focus)
      } else {
        setFocusModeInternal(focus)
      }
    },
    [onFocusModeChange],
  )

  const toggleCommentsPanel = () => setCommentsPanelOpen(!commentsPanelOpen)
  const toggleFocusMode = () => setFocusMode(!focusMode)

  const showCommentsPanel =
    (commentsPanelOpen || Boolean(composer)) && !focusMode && !isFullscreen
  const displayTitle = title ?? filename
  const immersive = focusMode || isFullscreen

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col",
        focusMode && "fixed inset-0 z-50 bg-black",
        className,
      )}
    >
      <div
        className={cn(
          "grid min-h-0 w-full flex-1 gap-2",
          showCommentsPanel
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(300px,32vw)]"
            : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-card shadow-sm",
            immersive
              ? "rounded-none border-0 bg-black"
              : "rounded-xl border border-border",
          )}
        >
          {!immersive ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-foreground">
                  {displayTitle}
                </h3>
                <p className="truncate text-xs text-muted-foreground">
                  {version}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {versionStatus ? (
                  <VersionStatusBadge status={versionStatus} />
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleCommentsPanel}
                  aria-label={showCommentsPanel ? "Hide comments panel" : "Show comments panel"}
                  aria-pressed={showCommentsPanel}
                  title={`${showCommentsPanel ? "Hide" : "Show"} comments (T)`}
                >
                  {showCommentsPanel ? (
                    <PanelRightClose className="size-4" />
                  ) : (
                    <PanelRightOpen className="size-4" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleFocusMode}
                  aria-label="Enter focus mode"
                  aria-pressed={focusMode}
                  title="Focus mode (Z)"
                >
                  <Focus className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1 overflow-hidden bg-black text-white">
            <MediaProvider />
            <VideoLoadingOverlay />
            <AnnotationOverlay comments={comments} />
            <VideoHotkeys
              onMarkNeedsRevision={
                statusUpdating ? undefined : onMarkNeedsRevision
              }
              onRequestApproveConfirm={
                statusUpdating ? undefined : onRequestApproveConfirm
              }
              onToggleCommentsPanel={focusMode ? undefined : toggleCommentsPanel}
              onToggleFocusMode={toggleFocusMode}
              focusMode={focusMode}
            />
            <VideoControls
              comments={comments}
              className={immersive ? "pb-2" : undefined}
            />

            {focusMode && !isFullscreen ? (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
                <p className="rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                  Focus mode — press <kbd className="font-mono">Z</kbd> to exit
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {showCommentsPanel ? (
          <CommentsPanel
            comments={comments}
            loading={commentsLoading}
            onCreateComment={onCreateComment}
            onResolveComment={
              onResolveComment
                ? (commentId, resolved) =>
                    void onResolveComment(commentId, resolved)
                : undefined
            }
            onDeleteComment={
              onDeleteComment
                ? (commentId) => void onDeleteComment(commentId)
                : undefined
            }
            resolvingCommentId={resolvingCommentId}
            deletingCommentId={deletingCommentId}
            className="min-h-[240px] lg:min-h-0"
          />
        ) : null}
      </div>
    </div>
  )
}

export function VideoReview({
  projectId,
  deliverableId,
  version,
  filename,
  title,
  comments,
  commentsLoading = false,
  onCreateComment,
  onResolveComment,
  onDeleteComment,
  onMarkNeedsRevision,
  onRequestApproveConfirm,
  versionStatus,
  resolvingCommentId = null,
  deletingCommentId = null,
  statusUpdating = false,
  className,
  commentsPanelOpen,
  onCommentsPanelOpenChange,
  focusMode,
  onFocusModeChange,
}: VideoReviewProps) {
  const playerRef = useRef<MediaPlayerInstance>(null)
  const src = getVideoUrl(projectId, deliverableId, version, filename)

  return (
    <MediaPlayer
      ref={playerRef}
      className={cn("video-review-shell min-h-0 flex-1 flex-col text-foreground", className)}
      title={title ?? filename}
      src={src}
      playsInline
      crossOrigin
      controlsDelay={2000}
      keyDisabled
    >
      <VideoPlayerProvider>
        <VideoReviewLayout
          projectId={projectId}
          deliverableId={deliverableId}
          version={version}
          filename={filename}
          title={title}
          comments={comments}
          commentsLoading={commentsLoading}
          onCreateComment={onCreateComment}
          onResolveComment={onResolveComment}
          onDeleteComment={onDeleteComment}
          onMarkNeedsRevision={onMarkNeedsRevision}
          onRequestApproveConfirm={onRequestApproveConfirm}
          versionStatus={versionStatus}
          resolvingCommentId={resolvingCommentId}
          deletingCommentId={deletingCommentId}
          statusUpdating={statusUpdating}
          commentsPanelOpen={commentsPanelOpen}
          onCommentsPanelOpenChange={onCommentsPanelOpenChange}
          focusMode={focusMode}
          onFocusModeChange={onFocusModeChange}
        />
      </VideoPlayerProvider>
    </MediaPlayer>
  )
}
