import { useState, type FormEvent } from "react"
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
import { LeadFormFields } from "@/components/client-management/lead-form-fields"
import { useLeadForm } from "@/components/client-management/use-lead-form"
import { validateLeadForm, type LeadFormValues } from "@/lib/lead-form"
import type { Lead } from "@/types/lead"

interface EditLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: LeadFormValues) => void
}

export function EditLeadModal({
  open,
  onOpenChange,
  lead,
  submitting = false,
  error,
  onSubmit,
}: EditLeadModalProps) {
  const { values, update, syncOpenState, handleOpenChange } = useLeadForm(lead)
  const [validationError, setValidationError] = useState<string | null>(null)

  syncOpenState(open, lead)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const message = validateLeadForm(values)
    if (message) {
      setValidationError(message)
      return
    }
    setValidationError(null)
    onSubmit(values)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => handleOpenChange(nextOpen, onOpenChange)}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update contact details and pipeline status for this lead.
            </DialogDescription>
          </DialogHeader>

          <LeadFormFields
            values={values}
            onChange={update}
            submitting={submitting}
            validationError={validationError ?? error}
          />

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="size-4" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
