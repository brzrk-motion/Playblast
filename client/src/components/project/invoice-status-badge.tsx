import { Badge } from "@/components/ui/badge"
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/invoices"
import { cn } from "@/lib/utils"
import type { InvoiceStatus } from "@/types/invoice"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  overdue?: boolean
  className?: string
}

export function InvoiceStatusBadge({
  status,
  overdue = false,
  className,
}: InvoiceStatusBadgeProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Badge variant="outline" className={INVOICE_STATUS_STYLES[status]}>
        {INVOICE_STATUS_LABELS[status]}
      </Badge>
      {overdue ? (
        <Badge variant="outline" className="border-destructive text-destructive">
          Overdue
        </Badge>
      ) : null}
    </div>
  )
}
