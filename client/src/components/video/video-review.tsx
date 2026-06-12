import "@vidstack/react/player/styles/base.css"

import { useRef } from "react"
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react"

import { AnnotationOverlay } from "@/components/video/annotation-overlay"
import { CommentComposer } from "@/components/video/comment-composer"
import { CommentsPanel } from "@/components/video/comments-panel"
import { VideoApprovalActions } from "@/components/video/video-approval-actions"
import { VideoControls } from "@/components/video/video-controls"
import { VideoHotkeys } from "@/components/video/video-hotkeys"
import { VideoLoadingOverlay } from "@/components/video/video-loading-overlay"
import { VideoPlayerProvider } from "@/context/video-player-provider"
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
}: VideoReviewProps) {
  const playerRef = useRef<MediaPlayerInstance>(null)
  const src = getVideoUrl(projectId, version, filename)

  return (
    <MediaPlayer
      ref={playerRef}
      className={cn(
        "grid gap-4 text-foreground lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start",
        className,
      )}
      title={title ?? filename}
      src={src}
      playsInline
      crossOrigin
    >
      <VideoPlayerProvider>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {title ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {projectId} / {version}
                </p>
              </div>
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
            </div>
          ) : null}

          <div className="relative aspect-video w-full overflow-hidden bg-black text-white">
            <MediaProvider />
            <VideoLoadingOverlay />
            <AnnotationOverlay comments={comments} />
            <VideoHotkeys
              onMarkNeedsRevision={
                statusUpdating ? undefined : onMarkNeedsRevision
              }
              onMarkApproved={statusUpdating ? undefined : onMarkApproved}
            />
            <VideoControls comments={comments} />
            <CommentComposer onSubmit={onCreateComment} />
          </div>
        </div>

        <CommentsPanel
          comments={comments}
          loading={commentsLoading}
          onResolveComment={
            onResolveComment
              ? (commentId, resolved) => void onResolveComment(commentId, resolved)
              : undefined
          }
          resolvingCommentId={resolvingCommentId}
          className="lg:sticky lg:top-4"
        />
      </VideoPlayerProvider>
    </MediaPlayer>
  )
}
