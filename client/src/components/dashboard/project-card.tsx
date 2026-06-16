import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProjectActionsMenu } from "@/components/project/project-actions-menu"
import { ProjectArchivedBadge } from "@/components/project/project-archived-badge"
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
  archived?: boolean
  clientName?: string
  budget?: ProjectBudget
  servicesEstimate?: number
  servicesEstimatedHours?: number
  deliverableCount: number
  compact?: boolean
  onArchive?: () => void
  onUnarchive?: () => void
  actionPending?: boolean
}

export function DashboardProjectCard({
  projectId,
  name,
  status,
  archived = false,
  clientName,
  budget,
  servicesEstimate,
  servicesEstimatedHours,
  deliverableCount,
  compact = false,
  onArchive,
  onUnarchive,
  actionPending = false,
}: DashboardProjectCardProps) {
  const financials = (
    <ProjectCardFinancials
      budget={budget}
      servicesEstimate={servicesEstimate}
      servicesEstimatedHours={servicesEstimatedHours}
    />
  )
  return (
    <Card className="interactive-card relative h-full border-muted">
      <div className="absolute top-2 right-2 z-10">
        <ProjectActionsMenu
          projectId={projectId}
          projectName={name}
          className="size-7"
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          actionPending={actionPending}
        />
      </div>
      <Link
        to={`/projects/${encodeURIComponent(projectId)}`}
        className="block rounded-xl focus-ring"
      >
        <CardHeader className={compact ? "gap-2 pb-2 pr-10" : "pb-3 pr-10"}>
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
          <div className="flex flex-wrap items-center gap-1.5">
            {archived ? <ProjectArchivedBadge /> : null}
            <ProjectStatusBadge status={status} />
          </div>
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
      </Link>
    </Card>
  )
}
