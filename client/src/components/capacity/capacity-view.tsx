import { Link } from "react-router-dom"
import { AlertTriangle, Gauge } from "lucide-react"
import { PipelineStatusBadge } from "@/components/pipeline/pipeline-status-badge"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  buildCapacityRows,
  capacityGaugePercent,
  isCapacityOverload,
  isProjectOverEstimate,
  projectUtilizationPercent,
  summarizeCapacity,
  type CapacityTotals,
  type ProjectCapacityRow,
} from "@/lib/capacity"
import { derivePipelineStatus, projectClientDisplayName } from "@/lib/pipeline"
import { formatHourEstimate } from "@/lib/services"
import { useWeeklyCapacityHours } from "@/lib/weekly-capacity"
import type { ProjectSummary } from "@/types/project"

function formatWeeksEstimate(remainingHours: number, weeklyCapacityHours: number): string {
  const weeks = remainingHours / weeklyCapacityHours
  return Number.isInteger(weeks) ? String(weeks) : weeks.toFixed(1)
}

function formatHoursValue(hours: number | null): string {
  if (hours === null) {
    return "—"
  }

  return `${formatHourEstimate(hours)}h`
}

interface CapacityStatProps {
  label: string
  value: string
  description?: string
}

function CapacityStat({ label, value, description }: CapacityStatProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

interface CapacityGaugeProps {
  totals: CapacityTotals
  weeklyCapacityHours: number | null
}

function CapacityGauge({ totals, weeklyCapacityHours }: CapacityGaugeProps) {
  if (weeklyCapacityHours === null || totals.totalRemainingHours === null) {
    return null
  }

  const overload = isCapacityOverload(
    totals.totalRemainingHours,
    weeklyCapacityHours,
  )
  const gaugePercent = capacityGaugePercent(
    totals.totalRemainingHours,
    weeklyCapacityHours,
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="size-4 text-muted-foreground" />
          Weekly capacity
        </CardTitle>
        <CardDescription>
          {formatHourEstimate(totals.totalRemainingHours)}h remaining across
          active projects vs {formatHourEstimate(weeklyCapacityHours)}h weekly
          capacity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress
          value={gaugePercent}
          className={
            overload
              ? "[&_[data-slot=progress-indicator]]:bg-destructive"
              : undefined
          }
        />

        {overload ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Remaining work exceeds your weekly capacity by{" "}
              {formatHourEstimate(
                totals.totalRemainingHours - weeklyCapacityHours,
              )}
              h. Consider delaying new work or adjusting timelines.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            At current weekly capacity, active work represents roughly{" "}
            {formatWeeksEstimate(
              totals.totalRemainingHours,
              weeklyCapacityHours,
            )}{" "}
            weeks of effort.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Adjust weekly capacity in{" "}
          <Link
            to="/settings"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Settings
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  )
}

interface ProjectCapacityTableProps {
  rows: ProjectCapacityRow[]
  timeTrackingAvailable: boolean
}

function ProjectCapacityTable({
  rows,
  timeTrackingAvailable,
}: ProjectCapacityTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Estimated</TableHead>
            <TableHead className="text-right">Logged</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead className="text-right">Complete</TableHead>
            <TableHead className="min-w-[8rem]">Utilisation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={8}
                className="py-8 text-center text-muted-foreground"
              >
                No active in-flight projects. Projects appear here when they are
                in progress or pending review.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const clientName = projectClientDisplayName(row.project)
              const utilization = projectUtilizationPercent(
                row.estimatedHours,
                row.loggedHours,
              )
              const overEstimate = isProjectOverEstimate(
                row.estimatedHours,
                row.loggedHours,
              )

              return (
                <TableRow key={row.project.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/projects/${encodeURIComponent(row.project.id)}`}
                      className="hover:underline focus-ring rounded-sm"
                    >
                      {row.project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {clientName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <PipelineStatusBadge
                      status={derivePipelineStatus(row.project)}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.estimatedHours > 0
                      ? `${formatHourEstimate(row.estimatedHours)}h`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {timeTrackingAvailable
                      ? formatHoursValue(row.loggedHours)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {timeTrackingAvailable
                      ? formatHoursValue(row.remainingHours)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {timeTrackingAvailable && row.percentComplete !== null
                      ? `${row.percentComplete}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {timeTrackingAvailable && row.estimatedHours > 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress
                          value={utilization}
                          className={
                            overEstimate
                              ? "[&_[data-slot=progress-indicator]]:bg-destructive"
                              : undefined
                          }
                        />
                        {overEstimate ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-destructive/40 bg-destructive/10 text-destructive"
                          >
                            Over
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

interface CapacityViewProps {
  projects: ProjectSummary[]
  compact?: boolean
}

export function CapacityView({ projects, compact = false }: CapacityViewProps) {
  const weeklyCapacityHours = useWeeklyCapacityHours()
  const totals = summarizeCapacity(projects)
  const rows = buildCapacityRows(projects)
  const timeTrackingAvailable = totals.totalLoggedHours !== null

  const stats = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <CapacityStat
        label="Active projects"
        value={String(totals.activeProjectCount)}
        description="In progress + pending review"
      />
      <CapacityStat
        label="Estimated hours"
        value={formatHoursValue(totals.totalEstimatedHours)}
        description="Across active projects"
      />
      <CapacityStat
        label="Logged hours"
        value={formatHoursValue(totals.totalLoggedHours)}
        description="Time tracked to date"
      />
      <CapacityStat
        label="Hours remaining"
        value={formatHoursValue(totals.totalRemainingHours)}
        description="Estimated minus logged"
      />
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-4">
        {stats}
        {!timeTrackingAvailable ? (
          <p className="text-sm text-muted-foreground">
            Time tracking is not available yet. Showing estimated hours only.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {stats}

      {!timeTrackingAvailable ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Time tracking is not available yet. Estimated hours are shown; logged
          hours, remaining hours, and utilisation will appear once time logs are
          enabled.
        </p>
      ) : null}

      <CapacityGauge totals={totals} weeklyCapacityHours={weeklyCapacityHours} />

      <section className="space-y-3">
        <div>
          <h3 className="font-medium">Per-project breakdown</h3>
          <p className="text-sm text-muted-foreground">
            Estimated hours from attached services compared to time logged on
            tasks.
          </p>
        </div>
        <ProjectCapacityTable
          rows={rows}
          timeTrackingAvailable={timeTrackingAvailable}
        />
      </section>
    </div>
  )
}
