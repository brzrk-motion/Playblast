import { useState } from "react"
import { formatTime } from "@vidstack/react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Pencil,
  RotateCcw,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"

type CommentFilter = "all" | "open" | "resolved"

export interface CommentsPanelProps {
  comments: Comment[]
  onResolveComment?: (commentId: string, resolved: boolean) => void
  resolvingCommentId?: string | null
  className?: string
}

function sortByTimestamp(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => a.timestamp - b.timestamp)
}

interface CommentRowProps {
  comment: Comment
  expanded?: boolean
  onResolveComment?: (commentId: string, resolved: boolean) => void
  resolving?: boolean
}

function CommentRow({
  comment,
  expanded = true,
  onResolveComment,
  resolving = false,
}: CommentRowProps) {
  const { seek } = useVideoPlayer()

  return (
    <li
      className={cn(
        "group border-b last:border-b-0",
        comment.resolved && "opacity-60",
      )}
    >
      <div className="flex items-start gap-1 px-4 py-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none rounded-sm -m-1 p-1"
          onClick={() => seek(comment.timestamp)}
        >
          <div className="flex items-center gap-2">
            <span className="type-timestamp text-primary">
              {formatTime(comment.timestamp)}
            </span>
            <span className="text-xs text-muted-foreground">{comment.author}</span>
            {comment.annotation ? (
              <Badge variant="outline" className="type-micro gap-1">
                <Pencil className="size-2.5" />
                Frame
              </Badge>
            ) : null}
            {comment.resolved ? (
              <Badge variant="outline" className="type-micro ml-auto">
                Resolved
              </Badge>
            ) : null}
          </div>
          {expanded ? (
            <p className="mt-1 text-sm text-foreground">{comment.body}</p>
          ) : (
            <p className="mt-1 truncate text-sm text-muted-foreground">{comment.body}</p>
          )}
        </button>

        {onResolveComment ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            disabled={resolving}
            aria-label={comment.resolved ? "Unresolve comment" : "Resolve comment"}
            title={comment.resolved ? "Unresolve" : "Resolve"}
            onClick={(event) => {
              event.stopPropagation()
              onResolveComment(comment.id, !comment.resolved)
            }}
          >
            {comment.resolved ? <RotateCcw /> : <Check />}
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function CommentsPanel({
  comments,
  onResolveComment,
  resolvingCommentId = null,
  className,
}: CommentsPanelProps) {
  const [filter, setFilter] = useState<CommentFilter>("all")
  const [resolvedExpanded, setResolvedExpanded] = useState(false)

  const sortedComments = sortByTimestamp(comments)
  const openComments = sortedComments.filter((comment) => !comment.resolved)
  const resolvedComments = sortedComments.filter((comment) => comment.resolved)

  const filteredComments =
    filter === "open"
      ? openComments
      : filter === "resolved"
        ? resolvedComments
        : sortedComments

  const showResolvedSection = filter === "all" && resolvedComments.length > 0
  const showOpenList = filter !== "resolved"
  const showResolvedList = filter === "resolved" || (filter === "all" && resolvedExpanded)

  const emptyMessage =
    filter === "open"
      ? "No open comments."
      : filter === "resolved"
        ? "No resolved comments."
        : "No comments yet."

  return (
    <Card className={cn("flex h-full min-h-0 flex-col", className)}>
      <CardHeader className="shrink-0 border-b">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Comments</CardTitle>
          <Badge variant="secondary">{openComments.length}</Badge>
        </div>
        <CardDescription>Sorted by timestamp. Click to seek.</CardDescription>

        <div
          className="flex gap-1 pt-1"
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

      <CardContent className="min-h-0 flex-1 p-0">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
            <MessageSquare className="size-8 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
            {filter === "all" ? (
              <p className="text-xs">
                Press <kbd className="rounded border px-1 text-foreground">C</kbd> or
                click the scrub bar to add one.
              </p>
            ) : null}
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[min(70vh,640px)]">
            {showOpenList && (filter === "open" || filter === "all") ? (
              <ul className="divide-y">
                {openComments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    onResolveComment={onResolveComment}
                    resolving={resolvingCommentId === comment.id}
                  />
                ))}
              </ul>
            ) : null}

            {filter === "resolved" ? (
              <ul className="divide-y">
                {resolvedComments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    onResolveComment={onResolveComment}
                    resolving={resolvingCommentId === comment.id}
                  />
                ))}
              </ul>
            ) : null}

            {showResolvedSection ? (
              <Collapsible open={resolvedExpanded} onOpenChange={setResolvedExpanded}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-t bg-muted/30 px-4 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50"
                  >
                    {resolvedExpanded ? (
                      <ChevronDown className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0" />
                    )}
                    <span>
                      {resolvedComments.length}{" "}
                      resolved {resolvedComments.length === 1 ? "comment" : "comments"}
                    </span>
                    <span className="ml-auto">{resolvedExpanded ? "Hide" : "Show"}</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {showResolvedList ? (
                    <ul className="divide-y border-t">
                      {resolvedComments.map((comment) => (
                        <CommentRow
                          key={comment.id}
                          comment={comment}
                          expanded={resolvedExpanded}
                          onResolveComment={onResolveComment}
                          resolving={resolvingCommentId === comment.id}
                        />
                      ))}
                    </ul>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
