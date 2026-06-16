import { useEffect, useState } from "react"
import { Receipt } from "lucide-react"
import { InvoiceStatusBadge } from "@/components/project/invoice-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { createInvoicePayment, getInvoice } from "@/lib/api"
import { formatEstimateCurrency } from "@/lib/budget"
import { formatInvoiceDate, todayIsoDate } from "@/lib/invoices"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { InvoiceWithPayments } from "@/types/invoice"

interface InvoiceDetailSheetProps {
  invoiceId: string | null
  open: boolean
  currency?: string
  onOpenChange: (open: boolean) => void
  onInvoiceUpdated?: (invoice: InvoiceWithPayments) => void
}

function DetailMetric({
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
      <p className={`mt-1 text-xl font-semibold tabular-nums ${className ?? ""}`}>
        {value}
      </p>
    </div>
  )
}

export function InvoiceDetailSheet({
  invoiceId,
  open,
  currency = "USD",
  onOpenChange,
  onInvoiceUpdated,
}: InvoiceDetailSheetProps) {
  const [invoice, setInvoice] = useState<InvoiceWithPayments | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [paidAt, setPaidAt] = useState(todayIsoDate())
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !invoiceId) {
      return
    }

    let cancelled = false

    async function load() {
      const currentInvoiceId = invoiceId
      if (!currentInvoiceId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await getInvoice(currentInvoiceId)
        if (!cancelled) {
          setInvoice(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load invoice")
          setError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [invoiceId, open])

  function resetPaymentForm() {
    setAmount("")
    setPaidAt(todayIsoDate())
    setNotes("")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setInvoice(null)
      setError(null)
      resetPaymentForm()
    }
    onOpenChange(nextOpen)
  }

  async function handleLogPayment(event: React.FormEvent) {
    event.preventDefault()
    if (!invoice) {
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showErrorToast("Payment amount must be greater than 0.")
      return
    }

    setSubmitting(true)
    try {
      const result = await createInvoicePayment(invoice.id, {
        amount: parsedAmount,
        paidAt,
        notes: notes.trim() || undefined,
      })
      setInvoice(result.invoice)
      onInvoiceUpdated?.(result.invoice)
      resetPaymentForm()
      showSuccessToast("Payment logged")
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to log payment"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {loading && !invoice ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error && !invoice ? (
          <div className="p-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : invoice ? (
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b px-6 pt-6 pb-4">
              <div className="space-y-3 pr-8">
                <div className="flex items-start gap-3">
                  <Receipt className="mt-1 size-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <SheetTitle className="text-2xl">
                      {invoice.invoiceNumber}
                    </SheetTitle>
                    <SheetDescription>
                      Issued {formatInvoiceDate(invoice.issuedAt)} · Due{" "}
                      {formatInvoiceDate(invoice.dueDate)}
                    </SheetDescription>
                  </div>
                </div>
                <InvoiceStatusBadge
                  status={invoice.status}
                  overdue={invoice.isOverdue}
                />
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailMetric
                  label="Total"
                  value={formatEstimateCurrency(invoice.total, currency)}
                />
                <DetailMetric
                  label="Paid"
                  value={formatEstimateCurrency(invoice.amountPaid, currency)}
                />
                <DetailMetric
                  label="Outstanding"
                  value={formatEstimateCurrency(
                    invoice.outstandingBalance,
                    currency,
                  )}
                  className={
                    invoice.outstandingBalance > 0
                      ? "text-destructive"
                      : undefined
                  }
                />
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-medium">Payment history</h3>
                {invoice.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No payments logged yet.
                  </p>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatInvoiceDate(payment.paidAt)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatEstimateCurrency(payment.amount, currency)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.notes ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              {invoice.status !== "paid" ? (
                <section className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-medium">Log payment</h3>
                  <form className="space-y-3" onSubmit={(event) => void handleLogPayment(event)}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="payment-amount">Amount</Label>
                        <Input
                          id="payment-amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-date">Payment date</Label>
                        <Input
                          id="payment-date"
                          type="date"
                          value={paidAt}
                          onChange={(event) => setPaidAt(event.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-notes">Notes (optional)</Label>
                      <Textarea
                        id="payment-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Deposit received, wire transfer, etc."
                        disabled={submitting}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Spinner className="size-4" /> : null}
                      Log payment
                    </Button>
                  </form>
                </section>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
