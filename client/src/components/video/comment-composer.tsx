import { useRef, useState } from "react"
import { formatTime } from "@vidstack/react"
import { MessageSquarePlus, Pencil, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { cn } from "@/lib/utils"
import type { FrameAnnotation } from "@/types/annotation"

const AUTHOR_STORAGE_KEY = "playblast-comment-author"

function getStoredAuthor() {
  if (typeof window === "undefined") {
    return "Reviewer"
  }

  return window.localStorage.getItem(AUTHOR_STORAGE_KEY) ?? "Reviewer"
}

export interface CommentComposerProps {
  onSubmit: (input: {
    timestamp: number
    body: string
    author: string
    annotation?: FrameAnnotation
  }) => Promise<void>
  className?: string
}

export function CommentComposerForm({
  timestamp,
  draftAnnotation,
  onSubmit,
  onClose,
  variant = "inline",
}: {
  timestamp: number
  draftAnnotation: FrameAnnotation | null
  onSubmit: CommentComposerProps["onSubmit"]
  onClose: () => void
  variant?: "inline" | "overlay"
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const authorRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = event.currentTarget
    const body = (form.elements.namedItem("body") as HTMLTextAreaElement).value.trim()
    const author = (form.elements.namedItem("author") as HTMLInputElement).value.trim()

    if (!body || !author) {
      return
    }

    window.localStorage.setItem(AUTHOR_STORAGE_KEY, author)
    setSubmitting(true)

    try {
      await onSubmit({
        timestamp,
        body,
        author,
        annotation: draftAnnotation ?? undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment")
      setSubmitting(false)
    }
  }

  const isInline = variant === "inline"

  return (
    <form
      className={cn("space-y-2", isInline && "space-y-2")}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquarePlus className="size-4 shrink-0 text-primary" />
          <span className="truncate">
            {isInline ? `At ${formatTime(timestamp)}` : `Comment at ${formatTime(timestamp)}`}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          onClick={onClose}
          aria-label="Close comment composer"
        >
          <X />
        </Button>
      </div>

      <div className={cn("flex gap-2", isInline ? "flex-col sm:flex-row" : "flex-col")}>
        <Input
          ref={authorRef}
          name="author"
          defaultValue={getStoredAuthor()}
          placeholder="Your name"
          aria-label="Author name"
          disabled={submitting}
          className={isInline ? "sm:w-32" : undefined}
        />

        <textarea
          ref={bodyRef}
          name="body"
          autoFocus
          placeholder="Leave feedback at this timestamp…"
          aria-label="Comment body"
          rows={isInline ? 2 : 3}
          className="w-full flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          disabled={submitting}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              onClose()
            }
          }}
        />
      </div>

      {draftAnnotation ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <Pencil className="size-3.5 shrink-0 text-primary" />
          <span>
            {draftAnnotation.shapes.length} frame annotation
            {draftAnnotation.shapes.length === 1 ? "" : "s"} attached — draw on the
            paused video
          </span>
        </div>
      ) : isInline ? (
        <p className="text-xs text-muted-foreground">
          Draw on the paused frame to attach annotations. Press{" "}
          <kbd className="rounded border px-1">C</kbd> to comment at the playhead.
        </p>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Pencil className="size-3.5 shrink-0 text-primary" />
          <span>Draw on the paused frame with the toolbar above the video</span>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner className="size-3.5" />
              Saving…
            </>
          ) : (
            "Add comment"
          )}
        </Button>
      </div>
    </form>
  )
}

export function CommentComposerInline({
  onSubmit,
  onOpenComposer,
  className,
}: CommentComposerProps & {
  onOpenComposer: (timestamp: number) => void
}) {
  const { composer, draftAnnotation, closeComposer, currentTime } = useVideoPlayer()

  if (composer) {
    return (
      <div className={cn("border-t bg-muted/20 p-3", className)}>
        <CommentComposerForm
          key={composer.timestamp}
          timestamp={composer.timestamp}
          draftAnnotation={draftAnnotation}
          onSubmit={onSubmit}
          onClose={closeComposer}
          variant="inline"
        />
      </div>
    )
  }

  return (
    <div className={cn("shrink-0 border-t bg-muted/20 p-3", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={() => onOpenComposer(currentTime)}
      >
        <MessageSquarePlus className="size-4" />
        Add comment at {formatTime(currentTime)}
      </Button>
    </div>
  )
}
