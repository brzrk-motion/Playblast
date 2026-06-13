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
import { LEAD_STATUS_LABELS } from "@/lib/leads"
import type { Lead, LeadStatus } from "@/types/lead"
import { LEAD_STATUSES } from "@/types/lead"

export interface LeadFormValues {
  name: string
  company: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  notes: string
}

interface AddLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  lead?: Lead | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: LeadFormValues) => void
}

function initialValues(lead?: Lead | null): LeadFormValues {
  return {
    name: lead?.name ?? "",
    company: lead?.company ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    source: lead?.source ?? "",
    status: lead?.status ?? "new",
    notes: lead?.notes ?? "",
  }
}

export function AddLeadModal({
  open,
  onOpenChange,
  mode,
  lead,
  submitting = false,
  error,
  onSubmit,
}: AddLeadModalProps) {
  const [values, setValues] = useState<LeadFormValues>(() => initialValues(lead))
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(lead))
    }
  }

  function update<K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add Lead" : "Edit Lead"}
            </DialogTitle>
            <DialogDescription>
              Track outreach and pipeline status for prospective clients.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="lead-name">Name</Label>
                <Input
                  id="lead-name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Contact name"
                  autoFocus
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-company">Company</Label>
                <Input
                  id="lead-company"
                  value={values.company}
                  onChange={(event) => update("company", event.target.value)}
                  placeholder="Studio or company"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={values.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="name@studio.com"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input
                  id="lead-phone"
                  value={values.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-source">Source</Label>
                <Input
                  id="lead-source"
                  value={values.source}
                  onChange={(event) => update("source", event.target.value)}
                  placeholder="e.g. Referral, LinkedIn"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) => update("status", value as LeadStatus)}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {LEAD_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-notes">Notes</Label>
              <Textarea
                id="lead-notes"
                value={values.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Optional context about this lead."
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
                  {mode === "create" ? "Adding…" : "Saving…"}
                </>
              ) : mode === "create" ? (
                "Add Lead"
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
