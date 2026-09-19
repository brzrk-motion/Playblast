import { Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  ESTIMATE_BUDGET_STATUS_DOT_STYLES,
  ESTIMATE_BUDGET_STATUS_LABELS,
  ESTIMATE_BUDGET_STATUS_STYLES,
  formatCurrency,
  formatEstimateCurrency,
} from "@/lib/budget"
import { calculateClientFinancialSummary } from "@/lib/client-financial-summary"
import type { ClientLinkedProject } from "@/types/client"
import { cn } from "@/lib/utils"

interface ClientFinancialSummaryPanelProps {
  projects: ClientLinkedProject[]
}

function formatSignedVariance(amount: number, currency: string): string {
  const formatted = formatEstimateCurrency(Math.abs(amount), currency)
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

function SummaryRow({
  label,
  amount,
  emphasized = false,
}: {
  label: string
  amount: string
  emphasized?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt
        className={
          emphasized ? "text-sm font-medium" : "text-sm text-muted-foreground"
        }
      >
        {label}
      </dt>
      <dd
        className={
          emphasized
            ? "text-sm font-semibold tabular-nums"
            : "text-sm tabular-nums"
        }
      >
        {amount}
      </dd>
    </div>
  )
}

export function ClientFinancialSummaryPanel({
  projects,
}: ClientFinancialSummaryPanelProps) {
  const summary = calculateClientFinancialSummary(projects)

  if (!summary.hasFinancialData) {
    return (
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Financial Summary</h3>
          <p className="text-xs text-muted-foreground">
            Totals across linked projects with services or budgets.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No estimates or budgets across linked projects yet.
        </div>
      </section>
    )
  }

  const varianceLabel =
    summary.variance === null
      ? null
      : summary.variance >= 0
        ? "Under budget"
        : "Over budget"

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Scale className="size-4 text-muted-foreground" />
            Financial Summary
          </h3>
          <p className="text-xs text-muted-foreground">
            Totals across linked projects with services or budgets.
          </p>
        </div>
        {summary.health ? (
          <Badge
            variant="outline"
            className={cn("gap-1.5", ESTIMATE_BUDGET_STATUS_STYLES[summary.health])}
          >
            <span
              className={cn(
                "inline-block size-2 rounded-full",
                ESTIMATE_BUDGET_STATUS_DOT_STYLES[summary.health],
              )}
              aria-hidden="true"
            />
            {ESTIMATE_BUDGET_STATUS_LABELS[summary.health]}
          </Badge>
        ) : null}
      </div>

      <dl className="space-y-2 rounded-lg border bg-muted/20 p-4">
        {summary.hasEstimates ? (
          <SummaryRow
            label="Total estimate"
            amount={formatCurrency(summary.totalEstimate, summary.currency)}
            emphasized
          />
        ) : null}
        {summary.hasBudgets ? (
          <SummaryRow
            label="Total budget"
            amount={formatCurrency(summary.totalBudget, summary.currency)}
            emphasized={!summary.hasEstimates}
          />
        ) : null}
        {summary.variance !== null ? (
          <SummaryRow
            label={`Variance (${varianceLabel})`}
            amount={formatSignedVariance(summary.variance, summary.currency)}
          />
        ) : null}
      </dl>
    </section>
  )
}
