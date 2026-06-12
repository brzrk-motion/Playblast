import "@vidstack/react/player/styles/base.css"

import { useCallback, useRef, useState } from "react"
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react"
import { Focus, PanelRightClose, PanelRightOpen } from "lucide-react"

import { AnnotationOverlay } from "@/components/video/annotation-overlay"
import { CommentsPanel } from "@/components/video/comments-panel"
import { VideoApprovalActions } from "@/components/video/video-approval-actions"
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

export interface VideoReviewProps {
  projectId: string
  version: string
  filename: string
  title?: string
  comments: Comment[]
  commentsLoading?: boolean
  onCreateComment: (input: {
    timestamp: number
    body: string
    author: string
    annotation?: FrameAnnotation
  }) => Promise<void>
  onResolveComment?: (commentId: string, resolved: boolean) => Promise<void>
  onMarkNeedsRevision?: () => void
  onMarkApproved?: () => void
  resolvingCommentId?: string | null
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
  onMarkNeedsRevision,
  onMarkApproved,
  resolvingCommentId = null,
  statusUpdating = false,
  className,
  commentsPanelOpen: commentsPanelOpenProp,
  onCommentsPanelOpenChange,
  focusMode: focusModeProp,
  onFocusModeChange,
}: VideoReviewLayoutProps) {
  const [commentsPanelOpenInternal, setCommentsPanelOpenInternal] = useState(true)
  const [focusModeInternal, setFocusModeInternal] = useState(false)
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

  const showCommentsPanel = (commentsPanelOpen || Boolean(composer)) && !focusMode
  const displayTitle = title ?? filename

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        focusMode && "fixed inset-0 z-50 bg-black",
        className,
      )}
    >
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-2",
          showCommentsPanel
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(300px,32vw)]"
            : "grid-cols-1",
        )}
      >
        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {!focusMode ? (
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
                <VideoApprovalActions
                  onMarkNeedsRevision={
                    onMarkNeedsRevision
                      ? () => onMarkNeedsRevision()
                      : undefined
                  }
                  onMarkApproved={
                    onMarkApproved ? () => onMarkApproved() : undefined
                  }
                  statusUpdating={statusUpdating}
                />

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
              onMarkApproved={statusUpdating ? undefined : onMarkApproved}
              onToggleCommentsPanel={focusMode ? undefined : toggleCommentsPanel}
              onToggleFocusMode={toggleFocusMode}
              focusMode={focusMode}
            />
            <VideoControls
              comments={comments}
              className={focusMode ? "pb-2" : undefined}
            />

            {focusMode ? (
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
            resolvingCommentId={resolvingCommentId}
            className="min-h-[240px] lg:min-h-0"
          />
        ) : null}
      </div>
    </div>
  )
}

export function VideoReview({
  projectId,
  version,
  filename,
  title,
  comments,
  commentsLoading = false,
  onCreateComment,
  onResolveComment,
  onMarkNeedsRevision,
  onMarkApproved,
  resolvingCommentId = null,
  statusUpdating = false,
  className,
  commentsPanelOpen,
  onCommentsPanelOpenChange,
  focusMode,
  onFocusModeChange,
}: VideoReviewProps) {
  const playerRef = useRef<MediaPlayerInstance>(null)
  const src = getVideoUrl(projectId, version, filename)

  return (
    <MediaPlayer
      ref={playerRef}
      className={cn("flex min-h-0 flex-1 flex-col text-foreground", className)}
      title={title ?? filename}
      src={src}
      playsInline
      crossOrigin
    >
      <VideoPlayerProvider>
        <VideoReviewLayout
          projectId={projectId}
          version={version}
          filename={filename}
          title={title}
          comments={comments}
          commentsLoading={commentsLoading}
          onCreateComment={onCreateComment}
          onResolveComment={onResolveComment}
          onMarkNeedsRevision={onMarkNeedsRevision}
          onMarkApproved={onMarkApproved}
          resolvingCommentId={resolvingCommentId}
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
