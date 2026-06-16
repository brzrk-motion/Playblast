import { useEffect, useMemo, useState } from "react"
import { FileText, Plus } from "lucide-react"
import { CreateInvoiceDialog } from "@/components/project/create-invoice-dialog"
import { InvoiceDetailSheet } from "@/components/project/invoice-detail-sheet"
import { InvoiceStatusBadge } from "@/components/project/invoice-status-badge"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createInvoice, listProjectInvoices } from "@/lib/api"
import { formatEstimateCurrency } from "@/lib/budget"
import { formatInvoiceDate } from "@/lib/invoices"
import { calculateProjectCostEstimate } from "@/lib/service-estimate"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { InvoiceSummary } from "@/types/invoice"
import type { ProjectServiceWithDetails } from "@/types/project-service"

interface ProjectInvoicesSectionProps {
  projectId: string
  currency?: string
  projectServices?: ProjectServiceWithDetails[]
  onOutstandingBalanceChange?: (balance: number) => void
}

export function ProjectInvoicesSection({
  projectId,
  currency = "USD",
  projectServices = [],
  onOutstandingBalanceChange,
}: ProjectInvoicesSectionProps) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  const suggestedTotal = useMemo(
    () => calculateProjectCostEstimate(projectServices).totalEstimate,
    [projectServices],
  )

  const outstandingBalance = useMemo(
    () => invoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0),
    [invoices],
  )

  useEffect(() => {
    let cancelled = false

    async function fetchInvoices() {
      setLoading(true)
      try {
        const data = await listProjectInvoices(projectId)
        if (!cancelled) {
          setInvoices(data)
          const balance = data.reduce(
            (sum, invoice) => sum + invoice.outstandingBalance,
            0,
          )
          onOutstandingBalanceChange?.(balance)
        }
      } catch (err) {
        if (!cancelled) {
          showErrorToast(humanizeApiError(err, "Failed to load invoices"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchInvoices()

    return () => {
      cancelled = true
    }
  }, [onOutstandingBalanceChange, projectId])

  async function handleCreateInvoice(values: {
    invoiceNumber: string
    issuedAt: string
    dueDate: string
    total: string
  }) {
    const total = Number(values.total)
    if (!Number.isFinite(total) || total <= 0) {
      setCreateError("Total amount must be greater than 0.")
      return
    }

    setCreating(true)
    setCreateError(null)
    try {
      const invoice = await createInvoice(projectId, {
        invoiceNumber: values.invoiceNumber.trim(),
        issuedAt: values.issuedAt,
        dueDate: values.dueDate,
        total,
      })
      setInvoices((current) => [invoice, ...current])
      onOutstandingBalanceChange?.(
        [invoice, ...invoices].reduce(
          (sum, item) => sum + item.outstandingBalance,
          0,
        ),
      )
      setCreateOpen(false)
      showSuccessToast("Invoice created")
    } catch (err) {
      setCreateError(humanizeApiError(err, "Failed to create invoice"))
      showErrorToast(humanizeApiError(err, "Failed to create invoice"))
    } finally {
      setCreating(false)
    }
  }

  function handleInvoiceUpdated(updated: InvoiceSummary) {
    setInvoices((current) => {
      const next = current.map((invoice) =>
        invoice.id === updated.id ? updated : invoice,
      )
      onOutstandingBalanceChange?.(
        next.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0),
      )
      return next
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
                Invoices
              </CardTitle>
              <CardDescription>
                Track issued invoices and manual payments for this project.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateError(null)
                setCreateOpen(true)
              }}
            >
              <Plus className="size-4" />
              New invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {outstandingBalance > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Outstanding balance
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-destructive">
                {formatEstimateCurrency(outstandingBalance, currency)}
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No invoices yet. Create one to start tracking payments.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedInvoiceId(invoice.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          Issued {formatInvoiceDate(invoice.issuedAt)}
                        </div>
                      </TableCell>
                      <TableCell>{formatInvoiceDate(invoice.dueDate)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge
                          status={invoice.status}
                          overdue={invoice.isOverdue}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEstimateCurrency(
                          invoice.outstandingBalance,
                          currency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        submitting={creating}
        error={createError}
        suggestedTotal={suggestedTotal > 0 ? suggestedTotal : undefined}
        onSubmit={(values) => void handleCreateInvoice(values)}
      />

      <InvoiceDetailSheet
        invoiceId={selectedInvoiceId}
        open={selectedInvoiceId !== null}
        currency={currency}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvoiceId(null)
          }
        }}
        onInvoiceUpdated={handleInvoiceUpdated}
      />
    </>
  )
}
