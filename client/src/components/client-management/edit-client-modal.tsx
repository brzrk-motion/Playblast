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
import { ClientFormFields } from "@/components/client-management/client-form-fields"
import { useClientForm } from "@/components/client-management/use-client-form"
import { validateClientForm, type ClientFormValues } from "@/lib/client-form"
import type { Client } from "@/types/client"

interface EditClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: ClientFormValues) => void
}

export function EditClientModal({
  open,
  onOpenChange,
  client,
  submitting = false,
  error,
  onSubmit,
}: EditClientModalProps) {
  const { values, update, syncOpenState, handleOpenChange } = useClientForm(client)
  const [validationError, setValidationError] = useState<string | null>(null)

  syncOpenState(open, client)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const message = validateClientForm(values)
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
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update contact details for this client.
            </DialogDescription>
          </DialogHeader>

          <ClientFormFields
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
