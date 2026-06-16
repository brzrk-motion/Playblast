import { Fragment, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  TimesheetEntryPanel,
  type TimesheetEntrySelection,
} from "@/components/timesheet/timesheet-entry-panel"
import {
  addWeeks,
  formatTimesheetHours,
  formatWeekRange,
  getWeekDates,
  WEEKDAY_LABELS,
} from "@/lib/timesheet"
import { cn } from "@/lib/utils"
import type { TimesheetWeek } from "@/types/timesheet"

interface TimesheetViewProps {
  data: TimesheetWeek | null
  loading: boolean
  weekStart: string
  onWeekChange: (weekStart: string) => void
  onRefresh: () => void
}

function projectDayTotals(
  tasks: TimesheetWeek["projects"][number]["tasks"],
): number[] {
  return tasks.reduce(
    (totals, task) => totals.map((total, index) => total + task.days[index]),
    Array.from({ length: 7 }, () => 0),
  )
}

export function TimesheetView({
  data,
  loading,
  weekStart,
  onWeekChange,
  onRefresh,
}: TimesheetViewProps) {
  const [selection, setSelection] = useState<TimesheetEntrySelection | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[6] ?? weekStart

  function openCell(
    projectName: string,
    taskId: string,
    taskName: string,
    date: string,
  ) {
    setSelection({ projectName, taskId, taskName, date })
    setPanelOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Weekly timesheet</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Previous week"
              onClick={() => onWeekChange(addWeeks(weekStart, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[12rem] text-center text-sm font-medium">
              {formatWeekRange(weekStart, weekEnd)}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Next week"
              onClick={() => onWeekChange(addWeeks(weekStart, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !data || data.projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No time logged for this week.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[12rem]">Project / Task</TableHead>
                  {WEEKDAY_LABELS.map((label) => (
                    <TableHead key={label} className="w-16 text-center">
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="w-20 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projects.map((project) => {
                  const subtotalDays = projectDayTotals(project.tasks)
                  return (
                    <Fragment key={project.projectId}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={9} className="font-semibold">
                          {project.projectName}
                        </TableCell>
                      </TableRow>
                      {project.tasks.map((task) => (
                        <TableRow key={task.taskId}>
                          <TableCell className="pl-8 text-muted-foreground">
                            {task.taskName}
                          </TableCell>
                          {task.days.map((hours, index) => {
                            const date = weekDates[index]
                            const label = formatTimesheetHours(hours)
                            return (
                              <TableCell key={`${task.taskId}-${index}`} className="p-1">
                                <button
                                  type="button"
                                  className={cn(
                                    "flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors",
                                    label
                                      ? "bg-primary/10 font-medium hover:bg-primary/20"
                                      : "text-muted-foreground hover:bg-muted",
                                  )}
                                  onClick={() =>
                                    openCell(
                                      project.projectName,
                                      task.taskId,
                                      task.taskName,
                                      date,
                                    )
                                  }
                                  aria-label={`Log time for ${task.taskName} on ${WEEKDAY_LABELS[index]}`}
                                >
                                  {label}
                                </button>
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-right font-medium">
                            {formatTimesheetHours(task.weekTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-b-2">
                        <TableCell className="pl-6 text-sm font-medium italic text-muted-foreground">
                          Subtotal
                        </TableCell>
                        {subtotalDays.map((hours, index) => (
                          <TableCell
                            key={`${project.projectId}-subtotal-${index}`}
                            className="text-center text-sm font-medium"
                          >
                            {formatTimesheetHours(hours)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right text-sm font-semibold">
                          {formatTimesheetHours(project.weekTotal)}
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Daily total</TableCell>
                  {data.dayTotals.map((hours, index) => (
                    <TableCell
                      key={`footer-${index}`}
                      className="text-center font-semibold"
                    >
                      {formatTimesheetHours(hours)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {formatTimesheetHours(data.grandTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {selection ? (
        <TimesheetEntryPanel
          key={`${selection.taskId}-${selection.date}`}
          selection={selection}
          open={panelOpen}
          onOpenChange={setPanelOpen}
          onChanged={onRefresh}
        />
      ) : null}
    </>
  )
}
