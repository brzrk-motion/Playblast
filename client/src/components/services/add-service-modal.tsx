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
import { ServiceFormFields } from "@/components/services/service-form-fields"
import { useServiceForm } from "@/components/services/use-service-form"
import {
  validateServiceForm,
  type ServiceFormValues,
} from "@/lib/service-form"

interface AddServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting?: boolean
  error?: string | null
  onSubmit: (values: ServiceFormValues) => void
}

export function AddServiceModal({
  open,
  onOpenChange,
  submitting = false,
  error,
  onSubmit,
}: AddServiceModalProps) {
  const { values, update, syncOpenState, handleOpenChange } = useServiceForm()
  const [validationError, setValidationError] = useState<string | null>(null)

  syncOpenState(open)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const message = validateServiceForm(values)
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
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>
              Add a catalog offering with estimated hours and hourly rate.
            </DialogDescription>
          </DialogHeader>

          <ServiceFormFields
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
                  Adding…
                </>
              ) : (
                "Add Service"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
