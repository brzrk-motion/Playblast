import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getProjectHoursSummary } from "@/lib/api"
import {
  formatSignedHoursDelta,
  hasLoggedTime,
  hoursDeltaStatus,
  HOURS_DELTA_STATUS_STYLES,
} from "@/lib/hours-summary"
import { formatHourEstimate } from "@/lib/services"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { ProjectHoursSummary } from "@/types/hours-summary"

interface ProjectHoursSummaryPanelProps {
  projectId: string
  refreshKey?: number
}

function DeltaCell({
  estimatedHours,
  loggedHours,
  className,
}: {
  estimatedHours: number
  loggedHours: number
  className?: string
}) {
  const delta = loggedHours - estimatedHours
  const status = hoursDeltaStatus(estimatedHours, loggedHours)

  return (
    <TableCell
      className={cn(
        "text-right tabular-nums font-medium",
        HOURS_DELTA_STATUS_STYLES[status],
        className,
      )}
    >
      {formatSignedHoursDelta(delta)}
    </TableCell>
  )
}

export function ProjectHoursSummaryPanel({
  projectId,
  refreshKey = 0,
}: ProjectHoursSummaryPanelProps) {
  const [summary, setSummary] = useState<ProjectHoursSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchSummary() {
      setLoading(true)
      try {
        const data = await getProjectHoursSummary(projectId)
        if (!cancelled) {
          setSummary(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load hours summary")
          setError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchSummary()

    return () => {
      cancelled = true
    }
  }, [projectId, refreshKey])

  const totalStatus =
    summary !== null
      ? hoursDeltaStatus(summary.totalEstimatedHours, summary.totalLoggedHours)
      : "healthy"

  return (
    <section
      aria-label="Hours summary"
      className="rounded-lg border bg-muted/30"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Clock className="size-4 text-muted-foreground" />
        <div>
          <h3 className="font-medium">Hours Summary</h3>
          <p className="text-sm text-muted-foreground">
            Estimated hours from attached services vs time logged on tasks.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : error ? (
        <p className="p-4 text-sm text-destructive">{error}</p>
      ) : summary ? (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead className="text-right">Logged</TableHead>
                <TableHead className="text-right">Delta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.lines.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No services attached. Add services to compare estimates
                    against logged time.
                  </TableCell>
                </TableRow>
              ) : (
                summary.lines.map((line) => (
                  <TableRow key={line.serviceId}>
                    <TableCell className="font-medium">
                      {line.serviceName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatHourEstimate(line.estimatedHours)}h
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      —
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {summary.lines.length > 0 ? (
              <TableFooter>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableCell className="font-semibold">Project total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatHourEstimate(summary.totalEstimatedHours)}h
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatHourEstimate(summary.totalLoggedHours)}h
                  </TableCell>
                  <DeltaCell
                    estimatedHours={summary.totalEstimatedHours}
                    loggedHours={summary.totalLoggedHours}
                    className="font-semibold"
                  />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>

          {!hasLoggedTime(summary) ? (
            <p className="border-t px-4 py-3 text-sm text-muted-foreground">
              No time logged yet. Start tracking time on tasks in the{" "}
              <Link
                to={`/projects/${projectId}`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Milestones
              </Link>{" "}
              tab.
            </p>
          ) : (
            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              Time is tracked per task; logged hours roll up to the project
              total above.
              {totalStatus === "over"
                ? " Logged time exceeds the services estimate."
                : totalStatus === "warning"
                  ? " Logged time is within 10% of the estimate."
                  : null}
            </p>
          )}
        </>
      ) : null}
    </section>
  )
}
