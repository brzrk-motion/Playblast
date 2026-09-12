import { useMemo, useState } from "react"
import { useInView } from "@/hooks/use-in-view"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/budget"
import {
  buildMonthlyRevenueBuckets,
  type RevenueDateField,
} from "@/lib/monthly-revenue"
import type { ProjectSummary } from "@/types/project"

interface MonthlyRevenueChartProps {
  projects: ProjectSummary[]
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      monthLabel: string
      fullLabel: string
      projectCount: number
      totalValue: number
    }
  }>
}

function ChartTooltip({
  active,
  payload,
  accent = false,
}: ChartTooltipProps & { accent?: boolean }) {
  if (!active || !payload?.length) {
    return null
  }

  const data = payload[0]?.payload
  if (!data) {
    return null
  }

  return (
    <div
      className={
        accent
          ? "rounded-lg border border-status-warning/30 bg-background px-3 py-2 text-sm shadow-md ring-1 ring-status-warning/20"
          : "rounded-lg border bg-background px-3 py-2 text-sm shadow-md"
      }
    >
      <p className="font-medium">{data.fullLabel}</p>
      <p className="text-muted-foreground">
        {data.projectCount} {data.projectCount === 1 ? "project" : "projects"}
      </p>
      <p className="font-medium text-status-warning-foreground">
        {formatCurrency(data.totalValue)}
      </p>
    </div>
  )
}

const ORANGE_BAR_ACTIVE = "var(--status-warning)"
const ORANGE_BAR_INACTIVE =
  "color-mix(in oklch, var(--status-warning) 50%, transparent)"

type RevenueBucket = ReturnType<typeof buildMonthlyRevenueBuckets>[number]

function RevenueChartBody({
  buckets,
  maxValue,
  year,
  activeFill = ORANGE_BAR_ACTIVE,
  inactiveFill = ORANGE_BAR_INACTIVE,
  wrapperClassName,
  maxBarSize = 40,
  tooltipAccent = false,
}: {
  buckets: RevenueBucket[]
  maxValue: number
  year: number
  activeFill?: string
  inactiveFill?: string
  wrapperClassName?: string
  maxBarSize?: number
  tooltipAccent?: boolean
}) {
  return (
    <>
      <div
        className={wrapperClassName ?? "h-[280px] w-full"}
        role="img"
        aria-describedby="monthly-revenue-data"
        aria-label={`Monthly estimated revenue chart for ${year}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={buckets}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(value: number) =>
                maxValue >= 1000
                  ? `${Math.round(value / 1000)}k`
                  : String(value)
              }
            />
            <Tooltip
              cursor={{ fill: "var(--status-warning-muted)", opacity: 0.45 }}
              content={<ChartTooltip accent={tooltipAccent} />}
            />
            <Bar
              dataKey="totalValue"
              radius={[4, 4, 0, 0]}
              maxBarSize={maxBarSize}
              isAnimationActive={false}
            >
              {buckets.map((bucket) => (
                <Cell
                  key={bucket.monthKey}
                  fill={
                    bucket.isCurrentMonth ? activeFill : inactiveFill
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table id="monthly-revenue-data" className="sr-only">
        <caption>Monthly estimated revenue for {year}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Projects</th>
            <th scope="col">Estimated revenue</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.monthLabel}>
              <th scope="row">{bucket.fullLabel}</th>
              <td>{bucket.projectCount}</td>
              <td>{formatCurrency(bucket.totalValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export function MonthlyRevenueChart({ projects }: MonthlyRevenueChartProps) {
  const [dateField, setDateField] = useState<RevenueDateField>("startDate")
  const { ref: chartViewportRef, inView: chartInView } = useInView()
  const year = new Date().getFullYear()

  const buckets = useMemo(
    () => buildMonthlyRevenueBuckets(projects, dateField),
    [projects, dateField],
  )

  const maxValue = useMemo(
    () => Math.max(...buckets.map((bucket) => bucket.totalValue), 0),
    [buckets],
  )

  const dateFieldLabel =
    dateField === "startDate" ? "start date" : "end date"

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-status-warning-foreground" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>
              Estimated project value by month for {year}, grouped by{" "}
              {dateFieldLabel}.
            </CardDescription>
          </div>
          <Tabs
            value={dateField}
            onValueChange={(value) => setDateField(value as RevenueDateField)}
          >
            <TabsList>
              <TabsTrigger value="startDate">By start date</TabsTrigger>
              <TabsTrigger value="endDate">By end date</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartViewportRef}>
          {chartInView ? (
            <RevenueChartBody
              buckets={buckets}
              maxValue={maxValue}
              year={year}
              wrapperClassName="h-[280px] w-full rounded-lg bg-gradient-to-b from-status-warning/10 via-transparent to-transparent p-2"
              maxBarSize={48}
            />
          ) : (
            <Skeleton
              className="h-[280px] w-full rounded-lg"
              aria-label="Loading monthly revenue chart"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MonthlyRevenueChart
