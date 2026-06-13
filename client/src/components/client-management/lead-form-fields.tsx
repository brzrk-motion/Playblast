import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { LeadFormValues } from "@/lib/lead-form"
import { LEAD_STATUS_LABELS } from "@/lib/leads"
import type { LeadFormStatus, LeadSource } from "@/types/lead"
import { LEAD_FORM_STATUSES, LEAD_SOURCES } from "@/types/lead"

interface LeadFormFieldsProps {
  values: LeadFormValues
  onChange: <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) => void
  submitting?: boolean
  validationError?: string | null
}

export function LeadFormFields({
  values,
  onChange,
  submitting = false,
  validationError,
}: LeadFormFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lead-name">Name</Label>
          <Input
            id="lead-name"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
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
            onChange={(event) => onChange("company", event.target.value)}
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
            onChange={(event) => onChange("email", event.target.value)}
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
            onChange={(event) => onChange("phone", event.target.value)}
            placeholder="Optional"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label>Source</Label>
          <Select
            value={values.source || "none"}
            onValueChange={(value) =>
              onChange("source", value === "none" ? "" : (value as LeadSource))
            }
            disabled={submitting}
          >
            <SelectTrigger id="lead-source">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) =>
              onChange("status", value as LeadFormStatus)
            }
            disabled={submitting}
          >
            <SelectTrigger id="lead-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_FORM_STATUSES.map((status) => (
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
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="Optional context about this lead."
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
