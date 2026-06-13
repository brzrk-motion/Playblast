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
import { Textarea } from "@/components/ui/textarea"
import type { Client } from "@/types/client"

export interface ClientFormValues {
  name: string
  company: string
  email: string
  phone: string
  website: string
  notes: string
}

interface AddClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  client?: Client | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: ClientFormValues) => void
}

function initialValues(client?: Client | null): ClientFormValues {
  return {
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    notes: client?.notes ?? "",
  }
}

export function AddClientModal({
  open,
  onOpenChange,
  mode,
  client,
  submitting = false,
  error,
  onSubmit,
}: AddClientModalProps) {
  const [values, setValues] = useState<ClientFormValues>(() =>
    initialValues(client),
  )
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(client))
    }
  }

  function update<K extends keyof ClientFormValues>(
    key: K,
    value: ClientFormValues[K],
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
              {mode === "create" ? "Add Client" : "Edit Client"}
            </DialogTitle>
            <DialogDescription>
              Add a client directly without converting from a lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="client-name">Name</Label>
                <Input
                  id="client-name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Contact name"
                  autoFocus
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-company">Company</Label>
                <Input
                  id="client-company"
                  value={values.company}
                  onChange={(event) => update("company", event.target.value)}
                  placeholder="Studio or company"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={values.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="name@studio.com"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  value={values.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="client-website">Website</Label>
                <Input
                  id="client-website"
                  value={values.website}
                  onChange={(event) => update("website", event.target.value)}
                  placeholder="https://"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-notes">Notes</Label>
              <Textarea
                id="client-notes"
                value={values.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Optional notes about this client."
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
                "Add Client"
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
