import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProjectStatusBadge } from "@/components/project/project-status-badge"
import {
  ESTIMATE_BUDGET_STATUS_DOT_STYLES,
  ESTIMATE_BUDGET_STATUS_LABELS,
  estimateBudgetStatus,
  formatCurrency,
} from "@/lib/budget"
import { useInternalHourlyCostRate } from "@/lib/internal-hourly-cost-rate"
import {
  calculateProjectProfitability,
  formatMarginPercent,
  MARGIN_STATUS_DOT_STYLES,
  MARGIN_STATUS_LABELS,
  marginStatus,
} from "@/lib/profitability"
import { cn } from "@/lib/utils"
import type { ProjectBudget } from "@/types/project"

function BudgetHealthDot({
  status,
  className,
}: {
  status: ReturnType<typeof estimateBudgetStatus>
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        ESTIMATE_BUDGET_STATUS_DOT_STYLES[status],
        className,
      )}
      title={ESTIMATE_BUDGET_STATUS_LABELS[status]}
      aria-label={ESTIMATE_BUDGET_STATUS_LABELS[status]}
    />
  )
}

function MarginHealthDot({
  status,
  className,
}: {
  status: ReturnType<typeof marginStatus>
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        MARGIN_STATUS_DOT_STYLES[status],
        className,
      )}
      title={MARGIN_STATUS_LABELS[status]}
      aria-label={MARGIN_STATUS_LABELS[status]}
    />
  )
}

export function ProjectCardFinancials({
  budget,
  servicesEstimate,
  servicesEstimatedHours,
  className,
}: {
  budget?: ProjectBudget
  servicesEstimate?: number
  servicesEstimatedHours?: number
  className?: string
}) {
  const internalHourlyCostRate = useInternalHourlyCostRate()
  const currency = budget?.currency ?? "USD"
  const hasEstimate = servicesEstimate !== undefined && servicesEstimate > 0
  const budgetTotal = budget?.total
  const hasBudget = budgetTotal !== undefined && budgetTotal > 0

  if (hasEstimate) {
    const showBudgetHealth = hasBudget
    const budgetStatus = showBudgetHealth
      ? estimateBudgetStatus(budgetTotal, servicesEstimate)
      : null

    const profitability =
      servicesEstimatedHours !== undefined && servicesEstimatedHours > 0
        ? calculateProjectProfitability({
            estimatedHours: servicesEstimatedHours,
            estimatedValue: servicesEstimate,
            actualHours: 0,
            internalHourlyCostRate,
          })
        : null

    const showMargin =
      profitability?.marginPercent !== null &&
      profitability?.marginPercent !== undefined

    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)}>
        <p className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="tabular-nums">
            Est. {formatCurrency(servicesEstimate, currency)}
          </span>
          {budgetStatus ? <BudgetHealthDot status={budgetStatus} /> : null}
        </p>
        {showMargin ? (
          <p className="flex min-w-0 items-center gap-1.5 truncate text-xs">
            <span className="tabular-nums">
              {profitability.isEstimatedMargin ? "Est. " : ""}
              {formatMarginPercent(profitability.marginPercent!)} margin
            </span>
            <MarginHealthDot
              status={marginStatus(profitability.marginPercent!)}
            />
          </p>
        ) : null}
      </div>
    )
  }

  if (hasBudget) {
    return (
      <p className={cn("truncate tabular-nums", className)}>
        {formatCurrency(budgetTotal, currency)}
      </p>
    )
  }

  return null
}

interface DashboardProjectCardProps {
  projectId: string
  name: string
  status: Parameters<typeof ProjectStatusBadge>[0]["status"]
  clientName?: string
  budget?: ProjectBudget
  servicesEstimate?: number
  servicesEstimatedHours?: number
  deliverableCount: number
  compact?: boolean
}

export function DashboardProjectCard({
  projectId,
  name,
  status,
  clientName,
  budget,
  servicesEstimate,
  servicesEstimatedHours,
  deliverableCount,
  compact = false,
}: DashboardProjectCardProps) {
  const financials = (
    <ProjectCardFinancials
      budget={budget}
      servicesEstimate={servicesEstimate}
      servicesEstimatedHours={servicesEstimatedHours}
    />
  )

  return (
    <Link
      to={`/projects/${encodeURIComponent(projectId)}`}
      className="block rounded-xl focus-ring"
    >
      <Card className="interactive-card h-full border-muted">
        <CardHeader className={compact ? "gap-2 pb-2" : "pb-3"}>
          <CardTitle
            className={cn(
              "leading-snug",
              compact ? "text-sm" : "text-base",
            )}
          >
            {name}
          </CardTitle>
          {clientName ? (
            <p className="truncate text-xs text-muted-foreground">{clientName}</p>
          ) : null}
          <ProjectStatusBadge status={status} />
        </CardHeader>
        <CardContent
          className={cn(
            "space-y-1 text-sm text-muted-foreground",
            compact && "pt-0",
          )}
        >
          {financials}
          <p>
            {deliverableCount}{" "}
            {deliverableCount === 1 ? "deliverable" : "deliverables"}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
