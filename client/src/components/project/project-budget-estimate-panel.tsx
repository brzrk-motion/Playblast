import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FileOutput, Scale, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  ESTIMATE_BUDGET_STATUS_LABELS,
  ESTIMATE_BUDGET_STATUS_STYLES,
  estimateBudgetStatus,
  estimateBudgetVariance,
  estimateBudgetVariancePercent,
  formatCurrency,
  formatEstimateCurrency,
} from "@/lib/budget"
import {
  calculateProjectCostEstimate,
  isProjectServiceHoursOverridden,
} from "@/lib/service-estimate"
import { InvoiceClientRequiredDialog } from "@/components/project/invoice-client-required-dialog"
import { Spinner } from "@/components/ui/spinner"
import { createInvoice, downloadInvoicePdf, getProjectHoursSummary } from "@/lib/api"
import { useInternalHourlyCostRate } from "@/lib/internal-hourly-cost-rate"
import {
  calculateProjectProfitability,
  formatMarginPercent,
  MARGIN_STATUS_STYLES,
  marginStatus,
} from "@/lib/profitability"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import { formatHourEstimate } from "@/lib/services"
import { cn } from "@/lib/utils"
import type { ProjectBudget } from "@/types/project"
import type { ProjectServiceWithDetails } from "@/types/project-service"

interface ProjectBudgetEstimatePanelProps {
  projectId: string
  projectServices: ProjectServiceWithDetails[]
  budget?: ProjectBudget
  loading?: boolean
  outstandingBalance?: number
  currency?: string
  hasClient: boolean
  onRequestClientLink: () => void
  onInvoiceCreated?: () => void
  /** Bumps when task time logs change so logged hours refresh. */
  hoursRefreshKey?: number
}

function formatSignedVariance(amount: number, currency: string): string {
  const formatted = formatEstimateCurrency(Math.abs(amount), currency)
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

function formatSignedVariancePercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10
  if (rounded > 0) return `+${rounded}%`
  if (rounded < 0) return `${rounded}%`
  return "0%"
}

export function ProjectBudgetEstimatePanel({
  projectId,
  projectServices,
  budget,
  loading = false,
  outstandingBalance = 0,
  currency: currencyProp,
  hasClient,
  onRequestClientLink,
  onInvoiceCreated,
  hoursRefreshKey = 0,
}: ProjectBudgetEstimatePanelProps) {
  const [generating, setGenerating] = useState(false)
  const [clientRequiredOpen, setClientRequiredOpen] = useState(false)
  const [loggedHours, setLoggedHours] = useState(0)
  const [loggedHoursLoading, setLoggedHoursLoading] = useState(true)
  const currency = currencyProp ?? budget?.currency ?? "USD"
  const estimate = calculateProjectCostEstimate(projectServices)
  const internalHourlyCostRate = useInternalHourlyCostRate()

  useEffect(() => {
    let cancelled = false

    async function fetchLoggedHours() {
      setLoggedHoursLoading(true)
      try {
        const summary = await getProjectHoursSummary(projectId)
        if (!cancelled) {
          setLoggedHours(summary.totalLoggedHours)
        }
      } catch {
        if (!cancelled) {
          setLoggedHours(0)
        }
      } finally {
        if (!cancelled) {
          setLoggedHoursLoading(false)
        }
      }
    }

    void fetchLoggedHours()

    return () => {
      cancelled = true
    }
  }, [projectId, hoursRefreshKey])

  const profitability = calculateProjectProfitability({
    estimatedHours: estimate.totalHours,
    estimatedValue: estimate.totalEstimate,
    actualHours: loggedHours,
    internalHourlyCostRate,
  })
  const budgetTotal = budget?.total
  const hasBudget = budgetTotal !== undefined && budgetTotal > 0
  const status = estimateBudgetStatus(budgetTotal, estimate.totalEstimate)
  const variance = hasBudget
    ? estimateBudgetVariance(budgetTotal, estimate.totalEstimate)
    : null
  const variancePercent = hasBudget
    ? estimateBudgetVariancePercent(budgetTotal, estimate.totalEstimate)
    : null

  async function handleGenerateInvoice() {
    if (!hasClient) {
      setClientRequiredOpen(true)
      return
    }

    if (estimate.lines.length === 0) {
      showErrorToast("Add at least one service before generating an invoice.")
      return
    }

    setGenerating(true)
    try {
      const invoice = await createInvoice(projectId)
      await downloadInvoicePdf(invoice.id)
      showSuccessToast(`Invoice #${invoice.invoiceNumber} generated`)
      onInvoiceCreated?.()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to generate invoice"))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card
      className={cn(
        hasBudget && status !== "healthy" && "border-l-4",
        hasBudget && status === "warning" && "border-l-status-warning",
        hasBudget && status === "over" && "border-l-destructive",
        hasBudget && status === "healthy" && "border-l-status-success",
      )}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="size-4 text-muted-foreground" />
              Estimate vs Budget
            </CardTitle>
            <CardDescription>
              Services estimate compared to the client budget for this project.
            </CardDescription>
          </div>
          {hasBudget ? (
            <Badge variant="outline" className={ESTIMATE_BUDGET_STATUS_STYLES[status]}>
              {ESTIMATE_BUDGET_STATUS_LABELS[status]}
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || generating}
            onClick={() => void handleGenerateInvoice()}
          >
            {generating ? <Spinner className="size-4" /> : <FileOutput />}
            Generate Invoice
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              hasBudget || outstandingBalance > 0
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : "sm:grid-cols-1 sm:max-w-xs",
            )}
          >
            <SummaryMetric
              label="Services Estimate"
              value={formatEstimateCurrency(estimate.totalEstimate, currency)}
            />
            {hasBudget ? (
              <>
                <SummaryMetric
                  label="Client Budget"
                  value={formatCurrency(budgetTotal, currency)}
                />
                <SummaryMetric
                  label="Variance"
                  value={
                    variance !== null && variancePercent !== null
                      ? `${formatSignedVariance(variance, currency)} (${formatSignedVariancePercent(variancePercent)})`
                      : "—"
                  }
                  className={cn(
                    variance !== null &&
                      variance < 0 &&
                      "text-destructive",
                    variance !== null &&
                      variance > 0 &&
                      "text-status-success-foreground",
                  )}
                />
              </>
            ) : null}
            {outstandingBalance > 0 ? (
              <SummaryMetric
                label="Outstanding Invoices"
                value={formatEstimateCurrency(outstandingBalance, currency)}
                className="text-destructive"
              />
            ) : null}
            {!hasBudget && outstandingBalance <= 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-1">
                No client budget set. Edit the project to add one and compare
                against the services estimate.
              </p>
            ) : null}
          </div>
        )}

        <section aria-label="Per-service breakdown">
          <h3 className="mb-3 text-sm font-medium">Per-Service Breakdown</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Line Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : estimate.lines.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No services attached. Add services to build an estimate.
                    </TableCell>
                  </TableRow>
                ) : (
                  estimate.lines.map(({ item, hours, lineTotal }) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.service.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            isProjectServiceHoursOverridden(item)
                              ? "italic"
                              : undefined
                          }
                        >
                          {formatHourEstimate(hours)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEstimateCurrency(item.service.hourlyRate, currency)}
                        /hr
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEstimateCurrency(lineTotal, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {!loading && estimate.lines.length > 0 ? (
                <TableFooter>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={3} className="font-semibold">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatEstimateCurrency(estimate.totalEstimate, currency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>
        </section>

        <section aria-label="Profitability">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="size-4 text-muted-foreground" />
              Profitability
            </h3>
            {profitability.marginPercent !== null ? (
              <Badge
                variant="outline"
                className={
                  MARGIN_STATUS_STYLES[
                    marginStatus(profitability.marginPercent)
                  ]
                }
              >
                {profitability.isEstimatedMargin ? "Estimated " : ""}
                {formatMarginPercent(profitability.marginPercent)} margin
              </Badge>
            ) : null}
          </div>

          {loading || loggedHoursLoading ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : estimate.lines.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Attach services to see profitability metrics.
            </p>
          ) : (
            <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryMetric
                  label="Estimated Hours"
                  value={formatHourEstimate(profitability.estimatedHours)}
                />
                <SummaryMetric
                  label="Actual Hours Logged"
                  value={formatHourEstimate(profitability.actualHours)}
                />
                <SummaryMetric
                  label="Estimated Value"
                  value={formatEstimateCurrency(
                    profitability.estimatedValue,
                    currency,
                  )}
                />
                {profitability.costBasis !== null ? (
                  <SummaryMetric
                    label="Cost Basis"
                    value={formatEstimateCurrency(
                      profitability.costBasis,
                      currency,
                    )}
                  />
                ) : null}
                {profitability.billedHourlyRate !== null ? (
                  <SummaryMetric
                    label="Billed Hourly Rate"
                    value={`${formatEstimateCurrency(profitability.billedHourlyRate, currency)}/hr`}
                  />
                ) : null}
                {profitability.effectiveHourlyRate !== null ? (
                  <SummaryMetric
                    label="Effective Hourly Rate"
                    value={`${formatEstimateCurrency(profitability.effectiveHourlyRate, currency)}/hr`}
                  />
                ) : null}
                {profitability.marginPercent !== null ? (
                  <SummaryMetric
                    label="Margin"
                    value={formatMarginPercent(profitability.marginPercent)}
                    className={cn(
                      marginStatus(profitability.marginPercent) === "critical" &&
                        "text-destructive",
                      marginStatus(profitability.marginPercent) === "healthy" &&
                        "text-status-success-foreground",
                    )}
                  />
                ) : null}
              </div>

              {profitability.isEstimatedMargin ? (
                <p className="text-sm text-muted-foreground">
                  Margin is estimated from service hours until time is logged on
                  project tasks.
                </p>
              ) : null}

              {profitability.marginPercent === null ? (
                <p className="text-sm text-muted-foreground">
                  Set an internal hourly cost rate in{" "}
                  <Link to="/settings" className="underline underline-offset-4">
                    Settings
                  </Link>{" "}
                  to calculate margin. Until then, compare estimated value to
                  billed hourly rates above.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </CardContent>

      <InvoiceClientRequiredDialog
        open={clientRequiredOpen}
        onOpenChange={setClientRequiredOpen}
        onAddClient={onRequestClientLink}
      />
    </Card>
  )
}

function SummaryMetric({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", className)}>
        {value}
      </p>
    </div>
  )
}
