import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { updateProject } from "@/lib/api"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface EditableProjectNameProps {
  projectId: string
  name: string
  autoFocus?: boolean
  onNameChange: (name: string) => void
  onEditEnd?: () => void
  className?: string
}

export function EditableProjectName({
  projectId,
  name,
  autoFocus = false,
  onNameChange,
  onEditEnd,
  className,
}: EditableProjectNameProps) {
  const [editing, setEditing] = useState(autoFocus)
  const [draft, setDraft] = useState(name)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) {
      return
    }

    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function startEditing() {
    setDraft(name)
    setEditing(true)
  }

  function cancelEditing() {
    setDraft(name)
    setEditing(false)
    onEditEnd?.()
  }

  async function saveName(nextName: string) {
    const trimmed = nextName.trim()
    if (!trimmed) {
      cancelEditing()
      return
    }

    if (trimmed === name) {
      setEditing(false)
      onEditEnd?.()
      return
    }

    setSaving(true)
    try {
      const updated = await updateProject(projectId, { name: trimmed })
      onNameChange(updated.name)
      setDraft(updated.name)
      setEditing(false)
      onEditEnd?.()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to rename project"))
      setDraft(name)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void saveName(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            void saveName(draft)
          }
          if (event.key === "Escape") {
            event.preventDefault()
            cancelEditing()
          }
        }}
        className={cn("type-page-title h-auto max-w-xl px-2 py-1", className)}
        aria-label="Project name"
      />
    )
  }

  return (
    <h2
      className={cn("type-page-title", className)}
      onClick={startEditing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          startEditing()
        }
      }}
      role="button"
      tabIndex={0}
    >
      {name}
    </h2>
  )
}
