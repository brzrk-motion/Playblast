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
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { convertLeadToClient } from "@/lib/api"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { Client } from "@/types/client"
import type { Lead } from "@/types/lead"

interface ConfirmConvertModalProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (client: Client, lead: Lead) => void
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

export function ConfirmConvertModal({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: ConfirmConvertModalProps) {
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [converting, setConverting] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAdditionalNotes("")
    }
    onOpenChange(nextOpen)
  }

  async function handleConvert() {
    if (!lead || lead.status === "converted") {
      return
    }

    setConverting(true)

    try {
      const client = await convertLeadToClient(lead.id, {
        notes: additionalNotes.trim() || undefined,
      })
      showSuccessToast(`${lead.name} has been converted to a client`)
      handleOpenChange(false)
      onSuccess?.(client, {
        ...lead,
        status: "converted",
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to convert lead"))
    } finally {
      setConverting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lead ? `Convert ${lead.name} to a Client?` : "Convert to Client?"}
          </DialogTitle>
          <DialogDescription>
            The following lead information will carry over to the new client
            record.
          </DialogDescription>
        </DialogHeader>

        {lead ? (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <SummaryRow label="Name" value={lead.name} />
              <SummaryRow label="Company" value={lead.company ?? "—"} />
              <SummaryRow label="Email" value={lead.email} />
            </dl>

            <div className="space-y-2">
              <Label htmlFor="convert-additional-notes">Additional Notes</Label>
              <Textarea
                id="convert-additional-notes"
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                placeholder="Optional notes to add to the client record"
                disabled={converting}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={converting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!lead || converting}
            onClick={() => void handleConvert()}
          >
            {converting ? (
              <>
                <Spinner className="size-4" />
                Converting…
              </>
            ) : (
              "Convert"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
