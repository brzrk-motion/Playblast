import { useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatHourEstimate } from "@/lib/services"
import { effectiveProjectServiceHours, isProjectServiceHoursOverridden } from "@/lib/service-estimate"
import type { ProjectServiceWithDetails } from "@/types/project-service"

function parseHourInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  if (Math.round(parsed * 10) / 10 !== parsed) {
    return null
  }

  return parsed
}

interface ProjectServiceHoursControlProps {
  item: ProjectServiceWithDetails
  disabled?: boolean
  onSave: (overrideHours: number | null) => Promise<void>
}

export function ProjectServiceHoursControl({
  item,
  disabled = false,
  onSave,
}: ProjectServiceHoursControlProps) {
  const effectiveHours = effectiveProjectServiceHours(item)
  const isOverridden = isProjectServiceHoursOverridden(item)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(effectiveHours))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEditing() {
    setDraft(String(effectiveHours))
    setEditing(true)
  }

  async function commitDraft() {
    const parsed = parseHourInput(draft)
    if (parsed === null) {
      setDraft(String(effectiveHours))
      setEditing(false)
      return
    }

    if (parsed === item.service.hourEstimate) {
      if (isOverridden) {
        setSaving(true)
        try {
          await onSave(null)
        } finally {
          setSaving(false)
        }
      }
      setEditing(false)
      return
    }

    if (parsed === item.overrideHours) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      await onSave(parsed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!isOverridden || saving || disabled) {
      return
    }

    setSaving(true)
    try {
      await onSave(null)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="h-7 w-16 px-2 text-sm tabular-nums"
          value={draft}
          disabled={saving || disabled}
          aria-label={`Hours for ${item.service.name}`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commitDraft()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void commitDraft()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              setDraft(String(effectiveHours))
              setEditing(false)
            }
          }}
        />
        <span className="text-sm text-muted-foreground">hrs</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={`text-sm tabular-nums underline-offset-4 hover:underline disabled:opacity-50 ${
          isOverridden ? "italic text-foreground" : "text-muted-foreground"
        }`}
        disabled={saving || disabled}
        onClick={() => startEditing()}
        aria-label={`Edit hours for ${item.service.name}`}
      >
        {formatHourEstimate(effectiveHours)} hrs
      </button>
      {isOverridden ? (
        <>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase">
            Custom
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6"
            disabled={saving || disabled}
            aria-label={`Reset hours for ${item.service.name} to catalog default`}
            onClick={() => void handleReset()}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </>
      ) : null}
    </div>
  )
}
