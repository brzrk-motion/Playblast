import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { revertClientToLead } from "@/lib/api"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { Client } from "@/types/client"
import type { Lead } from "@/types/lead"

interface ConfirmRevertModalProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (lead: Lead) => void
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[6rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

export function ConfirmRevertModal({
  client,
  open,
  onOpenChange,
  onSuccess,
}: ConfirmRevertModalProps) {
  const [reverting, setReverting] = useState(false)

  async function handleRevert() {
    if (!client) {
      return
    }

    setReverting(true)

    try {
      const lead = await revertClientToLead(client.id)
      showSuccessToast(`${client.name} has been moved back to leads`)
      onOpenChange(false)
      onSuccess?.(lead)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to convert client to lead"))
    } finally {
      setReverting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {client
              ? `Convert ${client.name} back to a Lead?`
              : "Convert to Lead?"}
          </DialogTitle>
          <DialogDescription>
            This client will move back into the leads pipeline and the client
            record will be removed. Linked projects must be archived or unlinked
            first.
          </DialogDescription>
        </DialogHeader>

        {client ? (
          <dl className="space-y-2 rounded-lg border bg-muted/20 p-4">
            <SummaryRow label="Name" value={client.name} />
            <SummaryRow label="Company" value={client.company ?? "—"} />
            <SummaryRow label="Email" value={client.email} />
          </dl>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={reverting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!client || reverting}
            onClick={() => void handleRevert()}
          >
            {reverting ? (
              <>
                <Spinner className="size-4" />
                Converting…
              </>
            ) : (
              "Convert to Lead"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
