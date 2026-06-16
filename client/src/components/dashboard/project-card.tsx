import { Link } from "react-router-dom"
import { Archive, ArchiveRestore, MoreHorizontal } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectArchivedBadge } from "@/components/project/project-archived-badge"
import { ProjectStatusBadge } from "@/components/project/project-status-badge"
import { Spinner } from "@/components/ui/spinner"
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
  archived?: boolean
  clientName?: string
  budget?: ProjectBudget
  servicesEstimate?: number
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
  deliverableCount,
  compact = false,
  onArchive,
  onUnarchive,
  actionPending = false,
}: DashboardProjectCardProps) {
  const financials = (
    <ProjectCardFinancials budget={budget} servicesEstimate={servicesEstimate} />
  )
  const hasMenu = Boolean(onArchive || onUnarchive)

  return (
    <Card className="interactive-card relative h-full border-muted">
      {hasMenu ? (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions for ${name}`}
                disabled={actionPending}
                onClick={(event) => event.stopPropagation()}
              >
                {actionPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <MoreHorizontal className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onArchive ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.preventDefault()
                    onArchive()
                  }}
                >
                  <Archive />
                  Archive project
                </DropdownMenuItem>
              ) : null}
              {onUnarchive ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.preventDefault()
                    onUnarchive()
                  }}
                >
                  <ArchiveRestore />
                  Unarchive project
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      <Link
        to={`/projects/${encodeURIComponent(projectId)}`}
        className="block rounded-xl focus-ring"
      >
        <CardHeader className={compact ? "gap-2 pb-2" : "pb-3"}>
          <CardTitle
            className={cn(
              "leading-snug",
              compact ? "text-sm" : "text-base",
              hasMenu && "pr-8",
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
