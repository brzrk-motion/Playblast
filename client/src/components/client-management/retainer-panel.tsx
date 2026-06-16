import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { updateRetainerHours } from "@/lib/api"
import {
  formatCurrency,
  formatCycleRange,
  formatHours,
  formatUtilizationPercent,
} from "@/lib/retainer"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { ClientWithProjects } from "@/types/client"

interface RetainerPanelProps {
  client: ClientWithProjects
  onUpdated: (client: ClientWithProjects) => void
}

interface RetainerHoursEntryProps {
  clientId: string
  hoursLogged: number
  saving: boolean
  onSaved: (client: ClientWithProjects) => void
  onSavingChange: (saving: boolean) => void
}

function RetainerHoursEntry({
  clientId,
  hoursLogged,
  saving,
  onSaved,
  onSavingChange,
}: RetainerHoursEntryProps) {
  const [hoursInput, setHoursInput] = useState(String(hoursLogged))

  async function handleSaveHours() {
    const nextHoursLogged = Number(hoursInput)
    if (!Number.isFinite(nextHoursLogged) || nextHoursLogged < 0) {
      showErrorToast("Enter a valid number of hours.")
      return
    }

    onSavingChange(true)

    try {
      const updated = await updateRetainerHours(clientId, nextHoursLogged)
      showSuccessToast("Retainer hours updated")
      onSaved(updated)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to update retainer hours"))
    } finally {
      onSavingChange(false)
    }
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <Label htmlFor="retainer-hours-logged">Log hours this cycle</Label>
      <div className="flex gap-2">
        <Input
          id="retainer-hours-logged"
          type="number"
          min="0"
          step="0.5"
          value={hoursInput}
          onChange={(event) => setHoursInput(event.target.value)}
          disabled={saving}
        />
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void handleSaveHours()}
        >
          {saving ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Manual entry until time tracking is available.
      </p>
    </div>
  )
}

export function RetainerPanel({ client, onUpdated }: RetainerPanelProps) {
  const summary = client.retainerSummary
  const [saving, setSaving] = useState(false)

  if (!client.isRetainer || !summary) {
    return null
  }

  const progressValue = Math.min(summary.utilizationPercent, 100)

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Retainer</h3>
        <p className="text-sm text-muted-foreground">
          Current cycle: {formatCycleRange(summary.cycleStart, summary.cycleEnd)}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cycle utilization</CardTitle>
          <CardDescription>
            {formatUtilizationPercent(summary.utilizationPercent, summary.isOverage)} used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress
            value={progressValue}
            className={
              summary.isOverage
                ? "[&_[data-slot=progress-indicator]]:bg-destructive"
                : undefined
            }
          />

          {summary.isOverage ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                Logged hours exceed the contracted amount by{" "}
                {formatHours(summary.hoursLogged - summary.hoursContracted)}.
              </p>
            </div>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Hours contracted</dt>
              <dd className="text-lg font-medium">
                {formatHours(summary.hoursContracted)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Hours logged</dt>
              <dd className="text-lg font-medium">
                {formatHours(summary.hoursLogged)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Hours remaining</dt>
              <dd className="text-lg font-medium">
                {formatHours(summary.hoursRemaining)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estimated cycle value</dt>
              <dd className="text-lg font-medium">
                {formatCurrency(summary.estimatedValue)}
              </dd>
            </div>
          </dl>

          <RetainerHoursEntry
            key={`${summary.cycleStart}-${summary.hoursLogged}`}
            clientId={client.id}
            hoursLogged={summary.hoursLogged}
            saving={saving}
            onSaved={onUpdated}
            onSavingChange={setSaving}
          />
        </CardContent>
      </Card>
    </section>
  )
}
