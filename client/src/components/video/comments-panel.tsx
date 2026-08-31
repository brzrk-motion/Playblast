import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MessageSquareReply,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { CommentComposerInline } from "@/components/video/comment-composer"
import { CommentBody } from "@/components/video/comment-body"
import { CommentsPanelSkeleton } from "@/components/video/comments-panel-skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { buildMentionCandidates } from "@/lib/mentions"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"
import type { FrameAnnotation } from "@/types/annotation"

const AUTHOR_STORAGE_KEY = "playblast-comment-author"

function getStoredAuthor() {
  if (typeof window === "undefined") {
    return "Reviewer"
  }

  return window.localStorage.getItem(AUTHOR_STORAGE_KEY) ?? "Reviewer"
}

type CommentFilter = "all" | "open" | "resolved"

const ACTIVE_COMMENT_THRESHOLD = 1

export interface CommentsPanelProps {
  comments: Comment[]
  loading?: boolean
  onCreateComment: (input: {
    timestamp: number
    body: string
    author: string
    annotation?: FrameAnnotation
  }) => Promise<void>
  onResolveComment?: (commentId: string, resolved: boolean) => void
  onDeleteComment?: (commentId: string) => void
  resolvingCommentId?: string | null
  deletingCommentId?: string | null
  className?: string
}

function sortByTimestamp(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => a.timestamp - b.timestamp)
}

function formatCommentTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`
}

function getAuthorInitial(author: string): string {
  const trimmed = author.trim()
  if (!trimmed) {
    return "?"
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  }

  return trimmed.slice(0, 2).toUpperCase()
}

function isMultilineBody(body: string): boolean {
  return body.includes("\n") || body.length > 120
}

function findActiveCommentId(
  comments: Comment[],
  currentTime: number,
): string | null {
  let closest: { id: string; distance: number } | null = null

  for (const comment of comments) {
    const distance = Math.abs(currentTime - comment.timestamp)
    if (distance <= ACTIVE_COMMENT_THRESHOLD) {
      if (!closest || distance < closest.distance) {
        closest = { id: comment.id, distance }
      }
    }
  }

  return closest?.id ?? null
}

interface CommentRowProps {
  comment: Comment
  mentionNames: string[]
  isActive?: boolean
  onResolveComment?: (commentId: string, resolved: boolean) => void
  onDeleteComment?: (commentId: string) => void
  onReply?: (comment: Comment) => void
  resolving?: boolean
  deleting?: boolean
  confirmingDelete?: boolean
  onRequestDelete?: () => void
  onConfirmDelete?: () => void
  onCancelDelete?: () => void
  rowRef?: (element: HTMLLIElement | null) => void
}

function commentRowLabel(comment: Comment): string {
  const kind = comment.annotation ? "Annotated comment" : "Comment"
  const status = comment.resolved ? ", resolved" : ""
  return `Seek to ${kind.toLowerCase()} at ${formatCommentTimestamp(comment.timestamp)} by ${comment.author}${status}`
}

function CommentRow({
  comment,
  mentionNames,
  isActive = false,
  onResolveComment,
  onDeleteComment,
  onReply,
  resolving = false,
  deleting = false,
  confirmingDelete = false,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  rowRef,
}: CommentRowProps) {
  const { seek } = useVideoPlayer()
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const showExpandToggle = isMultilineBody(comment.body) && !bodyExpanded
  const bodyId = `comment-body-${comment.id}`

  function handleRowActivate() {
    seek(comment.timestamp)
  }

  return (
    <li
      ref={rowRef}
      className={cn(
        "group border-b last:border-b-0 transition-colors duration-150",
        comment.resolved && "opacity-60",
        isActive && "border-l-2 border-l-primary bg-primary/5",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={commentRowLabel(comment)}
        aria-describedby={bodyId}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "interactive-row flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left",
          isActive && "bg-transparent hover:bg-primary/10",
        )}
        onClick={handleRowActivate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleRowActivate()
          }
        }}
      >
        <Avatar size="sm" className="mt-0.5" aria-hidden="true">
          <AvatarFallback className="text-[10px] font-medium">
            {getAuthorInitial(comment.author)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "group/pill type-timestamp inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary transition-colors hover:bg-primary/15",
                isActive && "bg-primary/15",
              )}
              aria-hidden="true"
            >
              <Play className="size-3 shrink-0 opacity-0 transition-opacity group-hover/pill:opacity-100" />
              {formatCommentTimestamp(comment.timestamp)}
            </span>

            <span className="text-xs font-medium text-foreground" aria-hidden="true">
              {comment.author}
            </span>

            {comment.annotation ? (
              <Badge variant="outline" className="type-micro gap-1" aria-hidden="true">
                <Pencil className="size-2.5" />
                Frame
              </Badge>
            ) : null}

            {comment.resolved ? (
              <Badge variant="outline" className="type-micro ml-auto" aria-hidden="true">
                Resolved
              </Badge>
            ) : null}
          </div>

          <CommentBody
            id={bodyId}
            body={comment.body}
            mentionNames={mentionNames}
            className={cn(
              "mt-1 text-sm text-foreground",
              !bodyExpanded && "line-clamp-2",
            )}
          />

          {showExpandToggle ? (
            <button
              type="button"
              className="mt-0.5 text-xs font-medium text-primary hover:underline"
              aria-expanded={false}
              aria-controls={bodyId}
              onClick={(event) => {
                event.stopPropagation()
                setBodyExpanded(true)
              }}
            >
              Show more
            </button>
          ) : bodyExpanded && isMultilineBody(comment.body) ? (
            <button
              type="button"
              className="mt-0.5 text-xs font-medium text-primary hover:underline"
              aria-expanded={true}
              aria-controls={bodyId}
              onClick={(event) => {
                event.stopPropagation()
                setBodyExpanded(false)
              }}
            >
              Show less
            </button>
          ) : null}
        </div>

        <div
          className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {confirmingDelete ? (
            <div className="flex flex-col gap-1" role="group" aria-label="Confirm delete">
              <Button
                type="button"
                variant="destructive"
                size="xs"
                disabled={deleting}
                aria-label={`Confirm delete comment by ${comment.author}`}
                onClick={onConfirmDelete}
              >
                {deleting ? <Spinner className="size-3" aria-hidden="true" /> : "Delete"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={deleting}
                aria-label="Cancel delete"
                onClick={onCancelDelete}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              {onReply ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={resolving || deleting}
                  aria-label={`Reply to ${comment.author}`}
                  title="Reply"
                  onClick={() => onReply(comment)}
                >
                  <MessageSquareReply aria-hidden="true" />
                </Button>
              ) : null}

              {onResolveComment ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={resolving || deleting}
                  aria-label={
                    comment.resolved
                      ? `Unresolve comment by ${comment.author}`
                      : `Resolve comment by ${comment.author}`
                  }
                  title={comment.resolved ? "Unresolve" : "Resolve"}
                  onClick={() => onResolveComment(comment.id, !comment.resolved)}
                >
                  {resolving ? (
                    <Spinner className="size-3" aria-hidden="true" />
                  ) : comment.resolved ? (
                    <RotateCcw aria-hidden="true" />
                  ) : (
                    <Check aria-hidden="true" />
                  )}
                </Button>
              ) : null}

              {onDeleteComment ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={resolving || deleting}
                  aria-label={`Delete comment by ${comment.author}`}
                  title="Delete"
                  onClick={onRequestDelete}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </li>
  )
}

export function CommentsPanel({
  comments,
  loading = false,
  onCreateComment,
  onResolveComment,
  onDeleteComment,
  resolvingCommentId = null,
  deletingCommentId = null,
  className,
}: CommentsPanelProps) {
  const { openComposer, closeComposer, currentTime } = useVideoPlayer()
  const [filter, setFilter] = useState<CommentFilter>("all")
  const [resolvedExpanded, setResolvedExpanded] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const lastScrolledActiveId = useRef<string | null>(null)

  function handleCloseComposer(options?: { resumePlayback?: boolean }) {
    setReplyDraft(null)
    closeComposer(options)
  }

  const mentionCandidates = useMemo(
    () =>
      buildMentionCandidates(
        comments.map((comment) => comment.author),
        getStoredAuthor(),
      ),
    [comments],
  )

  const sortedComments = sortByTimestamp(comments)
  const openComments = sortedComments.filter((comment) => !comment.resolved)
  const resolvedComments = sortedComments.filter((comment) => comment.resolved)

  const filteredComments =
    filter === "open"
      ? openComments
      : filter === "resolved"
        ? resolvedComments
        : sortedComments

  const activeCommentId = useMemo(
    () => findActiveCommentId(filteredComments, currentTime),
    [filteredComments, currentTime],
  )

  useEffect(() => {
    if (!activeCommentId) {
      lastScrolledActiveId.current = null
      return
    }

    if (activeCommentId === lastScrolledActiveId.current) {
      return
    }

    const element = rowRefs.current.get(activeCommentId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" })
      lastScrolledActiveId.current = activeCommentId
    }
  }, [activeCommentId])

  const showResolvedSection = filter === "all" && resolvedComments.length > 0
  const showOpenList = filter !== "resolved"
  const showResolvedList = filter === "resolved" || (filter === "all" && resolvedExpanded)

  const emptyMessage =
    filter === "open"
      ? "No open comments."
      : filter === "resolved"
        ? "No resolved comments."
        : "No comments yet."

  function setRowRef(commentId: string) {
    return (element: HTMLLIElement | null) => {
      if (element) {
        rowRefs.current.set(commentId, element)
      } else {
        rowRefs.current.delete(commentId)
      }
    }
  }

  function handleReply(comment: Comment) {
    setReplyDraft(`@${comment.author.trim()} `)
    openComposer(comment.timestamp)
  }

  function handleCreateComment(input: {
    timestamp: number
    body: string
    author: string
    annotation?: FrameAnnotation
  }) {
    setReplyDraft(null)
    return onCreateComment(input)
  }

  function renderCommentRow(comment: Comment) {
    return (
      <CommentRow
        key={comment.id}
        comment={comment}
        mentionNames={mentionCandidates}
        isActive={activeCommentId === comment.id}
        rowRef={setRowRef(comment.id)}
        onResolveComment={onResolveComment}
        onDeleteComment={onDeleteComment}
        onReply={handleReply}
        resolving={resolvingCommentId === comment.id}
        deleting={deletingCommentId === comment.id}
        confirmingDelete={confirmingDeleteId === comment.id}
        onRequestDelete={() => setConfirmingDeleteId(comment.id)}
        onConfirmDelete={() => {
          onDeleteComment?.(comment.id)
          setConfirmingDeleteId(null)
        }}
        onCancelDelete={() => setConfirmingDeleteId(null)}
      />
    )
  }

  return (
    <Card
      role="region"
      aria-labelledby="comments-panel-title"
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
    >
      <CardHeader className="shrink-0 space-y-2 border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle id="comments-panel-title" className="text-sm">
            Comments
          </CardTitle>
          <Badge variant="secondary" className="type-micro" aria-label={`${openComments.length} open`}>
            {openComments.length} open
          </Badge>
        </div>

        <div
          className="flex gap-1"
          role="group"
          aria-label="Filter comments"
        >
          {(["all", "open", "resolved"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="xs"
              variant={filter === value ? "secondary" : "ghost"}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >
              {value === "all" ? "All" : value === "open" ? "Open" : "Resolved"}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {loading ? (
          <ScrollArea className="min-h-0 flex-1">
            <CommentsPanelSkeleton />
          </ScrollArea>
        ) : filteredComments.length === 0 ? (
          <div
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center text-muted-foreground"
            role="status"
          >
            <MessageSquare className="size-7 opacity-50" aria-hidden="true" />
            <p className="text-sm">{emptyMessage}</p>
            {filter === "all" ? (
              <p className="text-xs">
                Press <kbd className="rounded border px-1 text-foreground">C</kbd> or use
                the input below.
              </p>
            ) : null}
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            {showOpenList && (filter === "open" || filter === "all") ? (
              <ul className="divide-y" aria-label="Open comments">
                {openComments.map(renderCommentRow)}
              </ul>
            ) : null}

            {filter === "resolved" ? (
              <ul className="divide-y" aria-label="Resolved comments">
                {resolvedComments.map(renderCommentRow)}
              </ul>
            ) : null}

            {showResolvedSection ? (
              <Collapsible open={resolvedExpanded} onOpenChange={setResolvedExpanded}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="focus-ring flex w-full items-center gap-2 border-t bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground transition-interactive hover:bg-muted/50 active:bg-muted/70"
                    aria-label={`${resolvedExpanded ? "Hide" : "Show"} ${resolvedComments.length} resolved comments`}
                  >
                    {resolvedExpanded ? (
                      <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span aria-hidden="true">
                      {resolvedComments.length} resolved
                    </span>
                    <span className="ml-auto" aria-hidden="true">
                      {resolvedExpanded ? "Hide" : "Show"}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {showResolvedList ? (
                    <ul className="divide-y border-t" aria-label="Resolved comments">
                      {resolvedComments.map(renderCommentRow)}
                    </ul>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </ScrollArea>
        )}

        <CommentComposerInline
          onSubmit={handleCreateComment}
          onOpenComposer={(timestamp) => {
            setReplyDraft(null)
            openComposer(timestamp)
          }}
          onClose={handleCloseComposer}
          mentionCandidates={mentionCandidates}
          initialBody={replyDraft ?? undefined}
        />
      </CardContent>
    </Card>
  )
}
