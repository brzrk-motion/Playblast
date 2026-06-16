import { useMemo, useState } from "react"
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

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const data = payload[0]?.payload
  if (!data) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{data.fullLabel}</p>
      <p className="text-muted-foreground">
        {data.projectCount} {data.projectCount === 1 ? "project" : "projects"}
      </p>
      <p className="font-medium">{formatCurrency(data.totalValue)}</p>
    </div>
  )
}

export function MonthlyRevenueChart({ projects }: MonthlyRevenueChartProps) {
  const [dateField, setDateField] = useState<RevenueDateField>("startDate")
  const year = new Date().getFullYear()

  const buckets = useMemo(
    () => buildMonthlyRevenueBuckets(projects, dateField),
    [projects, dateField],
  )

  const maxValue = useMemo(
    () => Math.max(...buckets.map((bucket) => bucket.totalValue), 0),
    [buckets],
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>
              Estimated project value by month for {year}, grouped by{" "}
              {dateField === "startDate" ? "start date" : "end date"}.
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
        <div
          className="h-[280px] w-full"
          role="img"
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
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                content={<ChartTooltip />}
              />
              <Bar
                dataKey="totalValue"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                isAnimationActive={false}
              >
                {buckets.map((bucket) => (
                  <Cell
                    key={bucket.monthKey}
                    fill={
                      bucket.isCurrentMonth
                        ? "var(--chart-1)"
                        : "color-mix(in oklch, var(--chart-1) 55%, transparent)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
