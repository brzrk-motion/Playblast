import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProjectActionsMenu } from "@/components/project/project-actions-menu"
import { ProjectStatusBadge } from "@/components/project/project-status-badge"
import {
  ESTIMATE_BUDGET_STATUS_DOT_STYLES,
  ESTIMATE_BUDGET_STATUS_LABELS,
  estimateBudgetStatus,
  formatCurrency,
} from "@/lib/budget"
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

export function ProjectCardFinancials({
  budget,
  servicesEstimate,
  className,
}: {
  budget?: ProjectBudget
  servicesEstimate?: number
  className?: string
}) {
  const currency = budget?.currency ?? "USD"
  const hasEstimate = servicesEstimate !== undefined && servicesEstimate > 0
  const budgetTotal = budget?.total
  const hasBudget = budgetTotal !== undefined && budgetTotal > 0

  if (hasEstimate) {
    const showHealth = hasBudget
    const status = showHealth
      ? estimateBudgetStatus(budgetTotal, servicesEstimate)
      : null

    return (
      <p className={cn("flex min-w-0 items-center gap-1.5 truncate", className)}>
        <span className="tabular-nums">
          Est. {formatCurrency(servicesEstimate, currency)}
        </span>
        {status ? <BudgetHealthDot status={status} /> : null}
      </p>
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
  deliverableCount,
  compact = false,
}: DashboardProjectCardProps) {
  const financials = (
    <ProjectCardFinancials budget={budget} servicesEstimate={servicesEstimate} />
  )

  return (
    <Card className="interactive-card relative h-full border-muted">
      <div className="absolute top-2 right-2 z-10">
        <ProjectActionsMenu
          projectId={projectId}
          projectName={name}
          className="size-7"
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
      </Link>
    </Card>
  )
}
