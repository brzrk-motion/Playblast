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

interface ServiceFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: Service | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: ServiceFormValues) => void | Promise<void>
}

export function ServiceFormModal({
  open,
  onOpenChange,
  service = null,
  submitting = false,
  error,
  onSubmit,
}: ServiceFormModalProps) {
  const isEdit = service !== null
  const { values, update, syncOpenState, handleOpenChange, reset } =
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = validateServiceForm(values)
    if (hasServiceFormErrors(errors)) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    try {
      await onSubmit(values)
      if (!isEdit) {
        reset()
        setFieldErrors({})
      }
    } catch {
      // API errors are surfaced via the error prop.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => handleOpenChange(nextOpen, onOpenChange)}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this catalog offering."
                : "Add a catalog offering with estimated hours and hourly rate."}
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
                  {isEdit ? "Saving…" : "Adding…"}
                </>
              ) : isEdit ? (
                "Save Changes"
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
