import {
  ESTIMATE_BUDGET_STATUS_DOT_STYLES,
  ESTIMATE_BUDGET_STATUS_LABELS,
  formatCurrency,
  formatEstimateCurrency,
} from "@/lib/budget"
import type { ClientFinancialSummary } from "@/lib/client-financials"
import { cn } from "@/lib/utils"

interface ClientFinancialSummaryPanelProps {
  summary: ClientFinancialSummary
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
      <dt className={emphasized ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
        {label}
      </dt>
      <dd className={emphasized ? "text-sm font-semibold tabular-nums" : "text-sm tabular-nums"}>
        {amount}
      </dd>
    </div>
  )
}

function formatSignedVariance(amount: number, currency: string): string {
  const formatted = formatEstimateCurrency(Math.abs(amount), currency)
  if (amount > 0) {
    return `+${formatted}`
  }
  if (amount < 0) {
    return `-${formatted}`
  }
  return formatted
}

function BudgetHealthDot({
  status,
  className,
}: {
  status: NonNullable<ClientFinancialSummary["aggregateBudgetStatus"]>
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

export function ClientFinancialSummaryPanel({
  summary,
}: ClientFinancialSummaryPanelProps) {
  if (!summary.hasFinancialData) {
    return (
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Financial Summary</h3>
          <p className="text-xs text-muted-foreground">
            Totals across linked projects with service estimates or budgets.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No service estimates or budgets on linked projects yet.
        </div>
      </section>
    )
  }

  const showVariance = summary.hasEstimateData && summary.hasBudgetData

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Financial Summary</h3>
          <p className="text-xs text-muted-foreground">
            Totals across linked projects with service estimates or budgets.
          </p>
        </div>
        {summary.aggregateBudgetStatus ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BudgetHealthDot status={summary.aggregateBudgetStatus} />
            <span>{ESTIMATE_BUDGET_STATUS_LABELS[summary.aggregateBudgetStatus]}</span>
          </div>
        ) : null}
      </div>

      <dl className="space-y-2 rounded-lg border bg-muted/20 p-4">
        {summary.hasEstimateData ? (
          <SummaryRow
            label="Total estimate"
            amount={formatEstimateCurrency(summary.totalEstimate, summary.currency)}
            emphasized
          />
        ) : null}
        {summary.hasBudgetData ? (
          <SummaryRow
            label="Total budget"
            amount={formatCurrency(summary.totalBudget, summary.currency)}
          />
        ) : null}
        {showVariance ? (
          <SummaryRow
            label="Variance (budget − estimate)"
            amount={formatSignedVariance(summary.variance, summary.currency)}
          />
        ) : null}
      </dl>
    </section>
  )
}
