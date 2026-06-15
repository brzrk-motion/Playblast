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
import type { Service } from "@/types/service"

interface EditServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: ServiceFormValues) => void
}

export function EditServiceModal({
  open,
  onOpenChange,
  service,
  submitting = false,
  error,
  onSubmit,
}: EditServiceModalProps) {
  const { values, update, syncOpenState, handleOpenChange } =
    useServiceForm(service)
  const [validationError, setValidationError] = useState<string | null>(null)

  syncOpenState(open, service)

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
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update this catalog offering.
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
