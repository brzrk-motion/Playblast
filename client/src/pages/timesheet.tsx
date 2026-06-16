import { useEffect, useState } from "react"
import { TimesheetView } from "@/components/timesheet/timesheet-view"
import { getWeeklyTimesheet } from "@/lib/api"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { getWeekStartFromDate } from "@/lib/timesheet"
import type { TimesheetWeek } from "@/types/timesheet"

export function TimesheetPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStartFromDate())
  const [data, setData] = useState<TimesheetWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const sheet = await getWeeklyTimesheet(weekStart)
        if (!cancelled) setData(sheet)
      } catch (err) {
        if (!cancelled) {
          showErrorToast(humanizeApiError(err, "Failed to load timesheet"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [weekStart, refreshToken])

  function handleWeekChange(nextWeekStart: string) {
    setLoading(true)
    setWeekStart(nextWeekStart)
  }

  function handleRefresh() {
    setLoading(true)
    setRefreshToken((current) => current + 1)
  }

  return (
    <div className="space-y-6">
      <TimesheetView
        data={data}
        loading={loading}
        weekStart={weekStart}
        onWeekChange={handleWeekChange}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
