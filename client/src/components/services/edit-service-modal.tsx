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
  hasServiceFormErrors,
  validateServiceForm,
  type ServiceFormFieldErrors,
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
  const [fieldErrors, setFieldErrors] = useState<ServiceFormFieldErrors>({})

  syncOpenState(open, service)

  function clearFieldError(key: keyof ServiceFormValues) {
    setFieldErrors((current) => {
      if (!current[key]) {
        return current
      }

      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = validateServiceForm(values)
    if (hasServiceFormErrors(errors)) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
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
            fieldErrors={fieldErrors}
            formError={error}
            onClearFieldError={clearFieldError}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleOpenChange(false, onOpenChange)}
            >
              Cancel
            </Button>
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
