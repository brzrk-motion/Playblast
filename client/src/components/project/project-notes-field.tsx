import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const COLLAPSE_CHAR_THRESHOLD = 180

interface ProjectNotesFieldProps {
  notes?: string
  disabled?: boolean
  onSave: (notes: string | null) => Promise<void>
}

export function ProjectNotesField({
  notes,
  disabled = false,
  onSave,
}: ProjectNotesFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(notes ?? "")
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus()
      const length = textareaRef.current?.value.length ?? 0
      textareaRef.current?.setSelectionRange(length, length)
    }
  }, [editing])

  const displayValue = notes?.trim() ? notes : null
  const isLong = (displayValue?.length ?? 0) > COLLAPSE_CHAR_THRESHOLD

  function startEditing() {
    if (disabled || saving) {
      return
    }
    setDraft(notes ?? "")
    setExpanded(true)
    setEditing(true)
  }

  async function commitDraft() {
    const trimmed = draft.trim()
    const next = trimmed ? trimmed : null
    const current = notes?.trim() ? notes.trim() : null

    if (next === current) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      await onSave(next)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setDraft(notes ?? "")
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <StickyNote className="size-3.5" />
          Internal notes
        </div>
        <Textarea
          ref={textareaRef}
          value={draft}
          disabled={saving || disabled}
          placeholder="Add internal notes..."
          className="min-h-[88px] resize-y bg-background text-sm"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commitDraft()}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void commitDraft()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              cancelEdit()
            }
          }}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Blur or ⌘+Enter to save · Esc to cancel
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <StickyNote className="size-3.5" />
        Internal notes
      </div>
      <button
        type="button"
        className={cn(
          "w-full rounded px-1 py-0.5 text-left text-sm -mx-1",
          displayValue
            ? "whitespace-pre-wrap text-foreground"
            : "italic text-muted-foreground/70",
          !disabled && !saving && "cursor-text hover:bg-muted/50",
          (disabled || saving) && "cursor-not-allowed opacity-50",
          isLong && !expanded && "line-clamp-3",
        )}
        disabled={disabled || saving}
        onClick={startEditing}
      >
        {displayValue ?? "Add internal notes..."}
      </button>
      {isLong && displayValue ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              Show more
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}
