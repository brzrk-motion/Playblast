import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ClientFormValues } from "@/lib/client-form"

interface ClientFormFieldsProps {
  values: ClientFormValues
  onChange: <K extends keyof ClientFormValues>(
    key: K,
    value: ClientFormValues[K],
  ) => void
  submitting?: boolean
  validationError?: string | null
}

export function ClientFormFields({
  values,
  onChange,
  submitting = false,
  validationError,
}: ClientFormFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-name">Name</Label>
          <Input
            id="client-name"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
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
            onChange={(event) => onChange("company", event.target.value)}
            placeholder="Studio or company"
            disabled={submitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-email">Email</Label>
          <Input
            id="client-email"
            type="email"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
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
            onChange={(event) => onChange("phone", event.target.value)}
            placeholder="Optional"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-website">Website</Label>
          <Input
            id="client-website"
            type="url"
            value={values.website}
            onChange={(event) => onChange("website", event.target.value)}
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
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="Optional notes about this client."
          rows={3}
          disabled={submitting}
        />
      </div>

      {validationError ? (
        <p className="text-sm text-destructive">{validationError}</p>
      ) : null}
    </div>
  )
}
