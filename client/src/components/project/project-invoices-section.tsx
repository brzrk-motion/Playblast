import { useEffect, useState } from "react"
import { Download, FileText } from "lucide-react"
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
import { downloadInvoicePdf, listInvoices } from "@/lib/api"
import { formatEstimateCurrency } from "@/lib/budget"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import type { Invoice } from "@/types/invoice"

interface ProjectInvoicesSectionProps {
  projectId: string
  currency?: string
}

function formatInvoiceDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ProjectInvoicesSection({
  projectId,
  currency = "USD",
}: ProjectInvoicesSectionProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchInvoices() {
      try {
        const data = await listInvoices(projectId)
        if (!cancelled) {
          setInvoices(data)
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
  }, [projectId])

  async function handleDownload(invoice: Invoice) {
    setDownloadingId(invoice.id)
    try {
      await downloadInvoicePdf(invoice.id)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to download invoice"))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4 text-muted-foreground" />
          Invoices
        </CardTitle>
        <CardDescription>
          Generated invoices for this project based on the services estimate.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-24 text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium tabular-nums">
                      #{invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{formatInvoiceDate(invoice.invoiceDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEstimateCurrency(
                        invoice.grandTotal,
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
                        onClick={() => void handleDownload(invoice)}
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
  )
}
