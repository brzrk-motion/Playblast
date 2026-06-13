import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LeadStatusBadge } from "@/components/client-management/lead-status-badge"
import { formatRelativeDate } from "@/lib/dates"
import type { Lead } from "@/types/lead"

interface LeadDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
}: LeadDetailDialogProps) {
  if (!lead) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
          <DialogDescription>
            {lead.company ?? "Lead details"}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3">
          <DetailRow label="Status" value={<LeadStatusBadge status={lead.status} />} />
          <DetailRow label="Email" value={lead.email} />
          <DetailRow label="Phone" value={lead.phone ?? "—"} />
          <DetailRow label="Source" value={lead.source ?? "—"} />
          <DetailRow
            label="Last contacted"
            value={formatRelativeDate(lead.lastContactedAt)}
          />
          <DetailRow label="Replied" value={lead.replied ? "Yes" : "No"} />
          <DetailRow label="Notes" value={lead.notes ?? "—"} />
        </dl>
      </DialogContent>
    </Dialog>
  )
}
