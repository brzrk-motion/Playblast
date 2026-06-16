import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  createTimeLog,
  deleteTimeLog,
  listTimeLogs,
  updateTimeLog,
} from "@/lib/api"
import { formatDateTime } from "@/lib/dates"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import { formatDurationHours } from "@/lib/time-log"
import { isoDateToLoggedAt, loggedAtToIsoDate } from "@/lib/timesheet"
import type { TimeLog } from "@/types/time-log"

export interface TimesheetEntrySelection {
  taskId: string
  taskName: string
  projectName: string
  date: string
}

interface TimesheetEntryPanelProps {
  selection: TimesheetEntrySelection
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

interface EntryFormState {
  hours: string
  notes: string
}

export function TimesheetEntryPanel({
  selection,
  open,
  onOpenChange,
  onChanged,
}: TimesheetEntryPanelProps) {
  const [entries, setEntries] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newEntry, setNewEntry] = useState<EntryFormState>({ hours: "", notes: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EntryFormState>({ hours: "", notes: "" })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await listTimeLogs(selection.taskId)
        if (cancelled) return
        setEntries(
          data.filter((entry) => loggedAtToIsoDate(entry.loggedAt) === selection.date),
        )
        setEditingId(null)
        setNewEntry({ hours: "", notes: "" })
      } catch (err) {
        if (!cancelled) {
          showErrorToast(humanizeApiError(err, "Failed to load time entries"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [selection])

  async function handleCreate() {
    const durationHours = Number(newEntry.hours)
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      showErrorToast("Enter a valid number of hours.")
      return
    }

    setSaving(true)
    try {
      const entry = await createTimeLog(selection.taskId, {
        durationHours,
        loggedAt: isoDateToLoggedAt(selection.date),
        notes: newEntry.notes.trim() || undefined,
      })
      setEntries((current) => [entry, ...current])
      setNewEntry({ hours: "", notes: "" })
      showSuccessToast(`Logged ${formatDurationHours(durationHours)}`)
      onChanged()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to log time"))
    } finally {
      setSaving(false)
    }
  }

  function startEditing(entry: TimeLog) {
    setEditingId(entry.id)
    setEditForm({
      hours: String(entry.durationHours),
      notes: entry.notes ?? "",
    })
  }

  async function handleSaveEdit(entryId: string) {
    const durationHours = Number(editForm.hours)
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      showErrorToast("Enter a valid number of hours.")
      return
    }

    setSaving(true)
    try {
      const updated = await updateTimeLog(entryId, {
        durationHours,
        loggedAt: isoDateToLoggedAt(selection.date),
        notes: editForm.notes.trim() || null,
      })
      setEntries((current) =>
        current.map((entry) => (entry.id === entryId ? updated : entry)),
      )
      setEditingId(null)
      showSuccessToast("Time entry updated")
      onChanged()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to update time entry"))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entryId: string) {
    setSaving(true)
    try {
      await deleteTimeLog(entryId)
      setEntries((current) => current.filter((entry) => entry.id !== entryId))
      showSuccessToast("Time entry deleted")
      onChanged()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete time entry"))
    } finally {
      setSaving(false)
    }
  }

  const dateLabel = new Date(`${selection.date}T12:00:00`).toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log time</SheetTitle>
          <SheetDescription>
            {selection.projectName} · {selection.taskName}
            <br />
            {dateLabel}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Add time</p>
            <div className="space-y-2">
              <Label htmlFor="timesheet-new-hours">Hours</Label>
              <Input
                id="timesheet-new-hours"
                type="number"
                min="0"
                step="0.25"
                placeholder="1.5"
                value={newEntry.hours}
                onChange={(event) =>
                  setNewEntry((current) => ({
                    ...current,
                    hours: event.target.value,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timesheet-new-notes">Note (optional)</Label>
              <Textarea
                id="timesheet-new-notes"
                rows={2}
                value={newEntry.notes}
                onChange={(event) =>
                  setNewEntry((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                disabled={saving}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={saving || !newEntry.hours.trim()}
              onClick={() => void handleCreate()}
            >
              {saving ? <Spinner className="size-4" /> : <Plus className="size-4" />}
              Add entry
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Entries for this day</p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : entries.length > 0 ? (
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li key={entry.id} className="rounded-lg border p-3">
                    {editingId === entry.id ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`edit-hours-${entry.id}`}>Hours</Label>
                          <Input
                            id={`edit-hours-${entry.id}`}
                            type="number"
                            min="0"
                            step="0.25"
                            value={editForm.hours}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                hours: event.target.value,
                              }))
                            }
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-notes-${entry.id}`}>Note</Label>
                          <Textarea
                            id={`edit-notes-${entry.id}`}
                            rows={2}
                            value={editForm.notes}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                notes: event.target.value,
                              }))
                            }
                            disabled={saving}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={saving}
                            onClick={() => void handleSaveEdit(entry.id)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {formatDurationHours(entry.durationHours)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(entry.loggedAt)}
                          </p>
                          {entry.notes ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {entry.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Edit time entry"
                            disabled={saving}
                            onClick={() => startEditing(entry)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Delete time entry"
                            disabled={saving}
                            onClick={() => void handleDelete(entry.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No time logged for this day yet.
              </p>
            )}
          </div>

          {entries.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Day total:{" "}
              <span className="font-medium text-foreground">
                {formatDurationHours(
                  entries.reduce((sum, entry) => sum + entry.durationHours, 0),
                )}
              </span>
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
