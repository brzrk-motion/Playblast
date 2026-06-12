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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_ORDER,
} from "@/lib/deliverables"
import type { Deliverable, DeliverableStatus } from "@/types/deliverable"

export interface DeliverableFormValues {
  name: string
  description: string
  status: DeliverableStatus
  dueDate: string
}

interface DeliverableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  deliverable?: Deliverable | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: DeliverableFormValues) => void
}

function initialValues(deliverable?: Deliverable | null): DeliverableFormValues {
  return {
    name: deliverable?.name ?? "",
    description: deliverable?.description ?? "",
    status: deliverable?.status ?? "not_started",
    dueDate: deliverable?.dueDate ? deliverable.dueDate.slice(0, 10) : "",
  }
}

export function DeliverableDialog({
  open,
  onOpenChange,
  mode,
  deliverable,
  submitting = false,
  error,
  onSubmit,
}: DeliverableDialogProps) {
  const [values, setValues] = useState<DeliverableFormValues>(() =>
    initialValues(deliverable),
  )
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(deliverable))
    }
  }

  function update<K extends keyof DeliverableFormValues>(
    key: K,
    value: DeliverableFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New Deliverable" : "Edit Deliverable"}
            </DialogTitle>
            <DialogDescription>
              Deliverables hold the versions you upload for proofing and approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deliverable-name">Name</Label>
              <Input
                id="deliverable-name"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="e.g. Hero Film 30s"
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) =>
                    update("status", value as DeliverableStatus)
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {DELIVERABLE_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverable-due">Due date</Label>
                <Input
                  id="deliverable-due"
                  type="date"
                  value={values.dueDate}
                  onChange={(event) => update("dueDate", event.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable-description">Description</Label>
              <Textarea
                id="deliverable-description"
                value={values.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Optional notes about this deliverable."
                rows={3}
                disabled={submitting}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="size-4" />
                  {mode === "create" ? "Creating…" : "Saving…"}
                </>
              ) : mode === "create" ? (
                "Create Deliverable"
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
