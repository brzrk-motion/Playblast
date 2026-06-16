import { useMemo, useState } from "react"
import { Clock, Play, Square, Timer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useTaskTimer } from "@/hooks/use-task-timer"
import { createTimeLog, deleteTimeLog, listTimeLogs } from "@/lib/api"
import { formatDateTime } from "@/lib/dates"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import { formatDurationHours, formatElapsedClock } from "@/lib/time-log"
import type { TimeLog } from "@/types/time-log"

interface TaskTimeLogControlProps {
  taskId: string
  totalHours?: number
  onTotalHoursChange?: (hours: number) => void
}

export function TaskTimeLogControl({
  taskId,
  totalHours: totalHoursProp,
  onTotalHoursChange,
}: TaskTimeLogControlProps) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [manualHours, setManualHours] = useState("")
  const [manualNotes, setManualNotes] = useState("")
  const { isRunning, elapsedMs, start, stop } = useTaskTimer(taskId)

  const totalHours = useMemo(() => {
    if (totalHoursProp !== undefined) return totalHoursProp
    return entries.reduce((sum, entry) => sum + entry.durationHours, 0)
  }, [entries, totalHoursProp])

  async function loadEntries() {
    setLoading(true)
    try {
      const data = await listTimeLogs(taskId)
      setEntries(data)
      onTotalHoursChange?.(
        data.reduce((sum, entry) => sum + entry.durationHours, 0),
      )
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to load time logs"))
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      void loadEntries()
    }
  }

  async function handleStopTimer() {
    const durationHours = stop()
    if (!durationHours) return

    setSaving(true)
    try {
      const entry = await createTimeLog(taskId, { durationHours })
      const nextEntries = [entry, ...entries]
      setEntries(nextEntries)
      onTotalHoursChange?.(
        nextEntries.reduce((sum, item) => sum + item.durationHours, 0),
      )
      showSuccessToast(`Logged ${formatDurationHours(durationHours)}`)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to log timer session"))
    } finally {
      setSaving(false)
    }
  }

  async function handleManualEntry() {
    const durationHours = Number(manualHours)
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      showErrorToast("Enter a valid number of hours.")
      return
    }

    setSaving(true)
    try {
      const entry = await createTimeLog(taskId, {
        durationHours,
        notes: manualNotes.trim() || undefined,
      })
      const nextEntries = [entry, ...entries]
      setEntries(nextEntries)
      onTotalHoursChange?.(
        nextEntries.reduce((sum, item) => sum + item.durationHours, 0),
      )
      setManualHours("")
      setManualNotes("")
      showSuccessToast(`Logged ${formatDurationHours(durationHours)}`)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to log time"))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEntry(entryId: string) {
    try {
      await deleteTimeLog(entryId)
      const nextEntries = entries.filter((entry) => entry.id !== entryId)
      setEntries(nextEntries)
      onTotalHoursChange?.(
        nextEntries.reduce((sum, item) => sum + item.durationHours, 0),
      )
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete time log"))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        {formatDurationHours(totalHours)}
      </span>

      {isRunning ? (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-status-success-foreground">
            {formatElapsedClock(elapsedMs)}
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={saving}
            onClick={() => void handleStopTimer()}
            aria-label="Stop timer"
          >
            {saving ? <Spinner className="size-4" /> : <Square className="size-4" />}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={start}
          aria-label="Start timer"
        >
          <Play className="size-4" />
        </Button>
      )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Log time manually"
          >
            <Clock className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-3">
          <PopoverHeader className="mb-3 gap-1">
            <PopoverTitle className="flex items-center gap-2">
              <Timer className="size-4" />
              Time log
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`manual-hours-${taskId}`}>Hours</Label>
              <Input
                id={`manual-hours-${taskId}`}
                type="number"
                min="0"
                step="0.25"
                placeholder="1.5"
                value={manualHours}
                onChange={(event) => setManualHours(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`manual-notes-${taskId}`}>Note (optional)</Label>
              <Textarea
                id={`manual-notes-${taskId}`}
                rows={2}
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                disabled={saving}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={saving || !manualHours.trim()}
              onClick={() => void handleManualEntry()}
            >
              {saving ? <Spinner className="size-4" /> : "Log time"}
            </Button>

            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Entries
              </p>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Spinner className="size-4" />
                </div>
              ) : entries.length > 0 ? (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-2 rounded-md border px-2 py-1.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {formatDurationHours(entry.durationHours)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(entry.loggedAt)}
                        </p>
                        {entry.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.notes}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => void handleDeleteEntry(entry.id)}
                        aria-label="Delete time log entry"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No time logged yet.</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
