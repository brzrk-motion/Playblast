import { useEffect, useMemo, useState } from "react"
import { Download, FileText } from "lucide-react"
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
import { downloadInvoicePdf, listProjectInvoices } from "@/lib/api"
import { formatEstimateCurrency } from "@/lib/budget"
import { formatInvoiceDate } from "@/lib/invoices"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import type { InvoiceSummary } from "@/types/invoice"

interface ProjectInvoicesSectionProps {
  projectId: string
  currency?: string
  refreshKey?: number
  onOutstandingBalanceChange?: (balance: number) => void
}

export function ProjectInvoicesSection({
  projectId,
  currency = "USD",
  refreshKey = 0,
  onOutstandingBalanceChange,
}: ProjectInvoicesSectionProps) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

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
  }, [onOutstandingBalanceChange, projectId, refreshKey])

  async function handleDownload(
    event: React.MouseEvent,
    invoice: InvoiceSummary,
  ) {
    event.stopPropagation()
    setDownloadingId(invoice.id)
    try {
      await downloadInvoicePdf(invoice.id)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to download invoice"))
    } finally {
      setDownloadingId(null)
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
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-muted-foreground" />
            Invoices
          </CardTitle>
          <CardDescription>
            Generated invoices for this project with payment tracking.
          </CardDescription>
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

          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : invoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No invoices yet. Generate one from the estimate panel above.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="w-24 text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedInvoiceId(invoice.id)}
                    >
                      <TableCell>
                        <div className="font-medium tabular-nums">
                          #{invoice.invoiceNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Issued {formatInvoiceDate(invoice.invoiceDate)}
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
                          invoice.currency || currency,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Download invoice ${invoice.invoiceNumber}`}
                          disabled={downloadingId === invoice.id}
                          onClick={(event) => void handleDownload(event, invoice)}
                        >
                          <Download className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
