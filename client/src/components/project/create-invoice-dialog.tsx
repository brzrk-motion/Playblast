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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  DUE_DATE_PRESETS,
  addDaysToIsoDate,
  todayIsoDate,
} from "@/lib/invoices"

export interface CreateInvoiceFormValues {
  invoiceNumber: string
  issuedAt: string
  dueDate: string
  total: string
}

interface CreateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting?: boolean
  error?: string | null
  suggestedTotal?: number
  onSubmit: (values: CreateInvoiceFormValues) => void
}

function initialValues(suggestedTotal?: number): CreateInvoiceFormValues {
  const issuedAt = todayIsoDate()
  return {
    invoiceNumber: "",
    issuedAt,
    dueDate: addDaysToIsoDate(issuedAt, 30),
    total: suggestedTotal ? String(suggestedTotal) : "",
  }
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  submitting = false,
  error,
  suggestedTotal,
  onSubmit,
}: CreateInvoiceDialogProps) {
  const [values, setValues] = useState<CreateInvoiceFormValues>(() =>
    initialValues(suggestedTotal),
  )
  const [wasOpen, setWasOpen] = useState(open)
  const [duePreset, setDuePreset] = useState<string>("30")

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(suggestedTotal))
      setDuePreset("30")
    }
  }

  function update<K extends keyof CreateInvoiceFormValues>(
    key: K,
    value: CreateInvoiceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleIssuedAtChange(nextIssuedAt: string) {
    update("issuedAt", nextIssuedAt)
    if (duePreset !== "custom") {
      update("dueDate", addDaysToIsoDate(nextIssuedAt, Number(duePreset)))
    }
  }

  function handleDuePresetChange(nextPreset: string) {
    if (!nextPreset) {
      return
    }

    setDuePreset(nextPreset)
    if (nextPreset !== "custom") {
      update("dueDate", addDaysToIsoDate(values.issuedAt, Number(nextPreset)))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice for this project. Payments can be logged manually
            after creation.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="invoice-number">Invoice number</Label>
            <Input
              id="invoice-number"
              value={values.invoiceNumber}
              onChange={(event) => update("invoiceNumber", event.target.value)}
              placeholder="INV-001"
              disabled={submitting}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-issued-at">Issued date</Label>
              <Input
                id="invoice-issued-at"
                type="date"
                value={values.issuedAt}
                onChange={(event) => handleIssuedAtChange(event.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-total">Total amount</Label>
              <Input
                id="invoice-total"
                type="number"
                min="0.01"
                step="0.01"
                value={values.total}
                onChange={(event) => update("total", event.target.value)}
                placeholder="0.00"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due date</Label>
            <ToggleGroup
              type="single"
              value={duePreset}
              onValueChange={handleDuePresetChange}
              variant="outline"
              size="sm"
              className="flex flex-wrap justify-start"
            >
              {DUE_DATE_PRESETS.map((preset) => (
                <ToggleGroupItem key={preset.days} value={String(preset.days)}>
                  {preset.label}
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
            </ToggleGroup>
            <Input
              id="invoice-due-date"
              type="date"
              value={values.dueDate}
              onChange={(event) => {
                setDuePreset("custom")
                update("dueDate", event.target.value)
              }}
              disabled={submitting}
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              Create invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
