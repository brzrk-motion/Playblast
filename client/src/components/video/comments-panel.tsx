import { formatTime } from "@vidstack/react"
import { MessageSquare } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"

export interface CommentsPanelProps {
  comments: Comment[]
  className?: string
}

export function CommentsPanel({ comments, className }: CommentsPanelProps) {
  const { seek } = useVideoPlayer()
  const sortedComments = [...comments].sort((a, b) => a.timestamp - b.timestamp)

  return (
    <Card className={cn("flex h-full min-h-0 flex-col", className)}>
      <CardHeader className="shrink-0 border-b">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Comments</CardTitle>
          <Badge variant="secondary">{sortedComments.length}</Badge>
        </div>
        <CardDescription>Sorted by timestamp. Click to seek.</CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        {sortedComments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
            <MessageSquare className="size-8 opacity-50" />
            <p className="text-sm">No comments yet.</p>
            <p className="text-xs">
              Press <kbd className="rounded border px-1 text-foreground">C</kbd> or
              click the scrub bar to add one.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[min(70vh,640px)]">
            <ul className="divide-y">
              {sortedComments.map((comment) => (
                <li key={comment.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                      comment.resolved && "opacity-60",
                    )}
                    onClick={() => seek(comment.timestamp)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-primary">
                        {formatTime(comment.timestamp)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comment.author}
                      </span>
                      {comment.resolved ? (
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          Resolved
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-foreground">{comment.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
