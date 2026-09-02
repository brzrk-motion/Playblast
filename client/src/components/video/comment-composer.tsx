import { useRef, useState } from "react"
import { formatTime } from "@vidstack/react"
import { MessageSquarePlus, Pencil, X } from "lucide-react"

import { MentionTextarea } from "@/components/video/mention-textarea"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { useSession } from "@/hooks/use-session"
import { getForbiddenMessage, redirectOnSessionExpired } from "@/lib/api"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { FrameAnnotation } from "@/types/annotation"

export interface CommentComposerProps {
  onSubmit: (input: {
    timestamp: number
    body: string
    annotation?: FrameAnnotation
  }) => Promise<void>
  mentionCandidates?: string[]
  initialBody?: string
  className?: string
}

export function CommentComposerForm({
  timestamp,
  draftAnnotation,
  onSubmit,
  onClose,
  mentionCandidates = [],
  initialBody = "",
  variant = "inline",
}: {
  timestamp: number
  draftAnnotation: FrameAnnotation | null
  onSubmit: CommentComposerProps["onSubmit"]
  onClose: (options?: { resumePlayback?: boolean }) => void
  mentionCandidates?: string[]
  initialBody?: string
  variant?: "inline" | "overlay"
}) {
  const { state } = useSession()
  const authorName =
    state.status === "ready" && state.session
      ? state.session.user.name
      : "Signed-in reviewer"
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState(initialBody)
  const [fieldErrors, setFieldErrors] = useState<{ body?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const trimmedBody = body.trim()
  const canSubmit = Boolean(trimmedBody) && !submitting

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!trimmedBody) {
      setFieldErrors({ body: "Comment can't be empty" })
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      await onSubmit({
        timestamp,
        body: trimmedBody,
        annotation: draftAnnotation ?? undefined,
      })
      onClose({ resumePlayback: true })
    } catch (err) {
      if (redirectOnSessionExpired(err)) {
        return
      }

      const forbiddenMessage = getForbiddenMessage(err)
      const message =
        forbiddenMessage ?? humanizeApiError(err, "Failed to add comment")
      setError(message)
      showErrorToast(message)
      setSubmitting(false)
    }
  }

  const isInline = variant === "inline"

  return (
    <form
      ref={formRef}
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
          onClick={() => onClose()}
          aria-label="Close comment composer"
        >
          <X />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Posting as <span className="font-medium text-foreground">{authorName}</span>
      </p>

      <div className="min-w-0 space-y-1">
        <MentionTextarea
          value={body}
          onChange={(nextBody) => {
            setBody(nextBody)
            if (fieldErrors.body) {
              setFieldErrors({})
            }
          }}
          mentionCandidates={mentionCandidates}
          autoFocus
          placeholder="Leave feedback at this timestamp… Type @ to mention someone."
          aria-label="Comment body"
          aria-invalid={fieldErrors.body ? true : undefined}
          rows={isInline ? 2 : 3}
          className="w-full flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
          disabled={submitting}
          onEscape={() => onClose()}
          onSubmit={() => {
            formRef.current?.requestSubmit()
          }}
        />
        {fieldErrors.body ? (
          <p role="alert" className="text-xs text-destructive">
            {fieldErrors.body}
          </p>
        ) : null}
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
          onClick={() => onClose()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
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
  mentionCandidates = [],
  initialBody,
  onClose,
  className,
}: CommentComposerProps & {
  onOpenComposer: (timestamp: number) => void
  onClose?: (options?: { resumePlayback?: boolean }) => void
}) {
  const { composer, draftAnnotation, closeComposer, currentTime } = useVideoPlayer()
  const handleClose = onClose ?? closeComposer

  if (composer) {
    return (
      <div className={cn("border-t bg-muted/20 p-3", className)}>
        <CommentComposerForm
          key={`${composer.timestamp}-${initialBody ?? ""}`}
          timestamp={composer.timestamp}
          draftAnnotation={draftAnnotation}
          onSubmit={onSubmit}
          onClose={handleClose}
          mentionCandidates={mentionCandidates}
          initialBody={initialBody}
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
