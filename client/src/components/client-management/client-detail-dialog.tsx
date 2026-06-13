import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateAdded } from "@/lib/dates"
import type { Client } from "@/types/client"

interface ClientDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  linkedProjectCount?: number
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

export function ClientDetailDialog({
  open,
  onOpenChange,
  client,
  linkedProjectCount = 0,
}: ClientDetailDialogProps) {
  if (!client) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client.name}</DialogTitle>
          <DialogDescription>
            {client.company ?? "Client details"}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3">
          <DetailRow label="Email" value={client.email} />
          <DetailRow label="Phone" value={client.phone ?? "—"} />
          <DetailRow label="Website" value={client.website ?? "—"} />
          <DetailRow
            label="Linked projects"
            value={linkedProjectCount}
          />
          <DetailRow
            label="Date added"
            value={formatDateAdded(client.createdAt)}
          />
          <DetailRow label="Notes" value={client.notes ?? "—"} />
        </dl>
      </DialogContent>
    </Dialog>
  )
}
