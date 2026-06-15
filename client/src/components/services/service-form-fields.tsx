import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  ServiceFormFieldErrors,
  ServiceFormValues,
} from "@/lib/service-form"
import { SERVICE_TYPE_LABELS } from "@/lib/services"
import { SERVICE_TYPES } from "@/types/service"

interface ServiceFormFieldsProps {
  values: ServiceFormValues
  onChange: <K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
  ) => void
  submitting?: boolean
  fieldErrors?: ServiceFormFieldErrors
  formError?: string | null
  onClearFieldError?: (key: keyof ServiceFormValues) => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-destructive">{message}</p>
}

export function ServiceFormFields({
  values,
  onChange,
  submitting = false,
  fieldErrors,
  formError,
  onClearFieldError,
}: ServiceFormFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="service-name">Name</Label>
          <Input
            id="service-name"
            value={values.name}
            onChange={(event) => {
              onChange("name", event.target.value)
              onClearFieldError?.("name")
            }}
            placeholder="e.g. Product hero render"
            autoFocus
            disabled={submitting}
            maxLength={100}
            aria-invalid={fieldErrors?.name ? true : undefined}
          />
          <FieldError message={fieldErrors?.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-type">Type</Label>
          <Select
            value={values.type}
            onValueChange={(value) => {
              onChange("type", value as ServiceFormValues["type"])
              onClearFieldError?.("type")
            }}
            disabled={submitting}
          >
            <SelectTrigger
              id="service-type"
              aria-invalid={fieldErrors?.type ? true : undefined}
            >
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {SERVICE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={fieldErrors?.type} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-hour-estimate">Hour estimate</Label>
          <Input
            id="service-hour-estimate"
            type="number"
            min={0.1}
            step="0.1"
            value={values.hourEstimate}
            onChange={(event) => {
              onChange("hourEstimate", event.target.value)
              onClearFieldError?.("hourEstimate")
            }}
            placeholder="0.0"
            disabled={submitting}
            aria-invalid={fieldErrors?.hourEstimate ? true : undefined}
          />
          <FieldError message={fieldErrors?.hourEstimate} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="service-hourly-rate">Hourly rate</Label>
          <Input
            id="service-hourly-rate"
            type="number"
            min={0.01}
            step="0.01"
            value={values.hourlyRate}
            onChange={(event) => {
              onChange("hourlyRate", event.target.value)
              onClearFieldError?.("hourlyRate")
            }}
            placeholder="0.00"
            disabled={submitting}
            aria-invalid={fieldErrors?.hourlyRate ? true : undefined}
          />
          <FieldError message={fieldErrors?.hourlyRate} />
        </div>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
    </div>
  )
}
