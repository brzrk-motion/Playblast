import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ServiceFormValues } from "@/lib/service-form"
import { SERVICE_TYPE_LABELS } from "@/lib/services"
import { SERVICE_TYPES } from "@/types/service"

interface ServiceFormFieldsProps {
  values: ServiceFormValues
  onChange: <K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
  ) => void
  submitting?: boolean
  validationError?: string | null
}

export function ServiceFormFields({
  values,
  onChange,
  submitting = false,
  validationError,
}: ServiceFormFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="service-name">Name</Label>
          <Input
            id="service-name"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="e.g. Product hero render"
            autoFocus
            disabled={submitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-type">Type</Label>
          <Select
            value={values.type}
            onValueChange={(value) =>
              onChange("type", value as ServiceFormValues["type"])
            }
            disabled={submitting}
          >
            <SelectTrigger id="service-type">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-hour-estimate">Hour estimate</Label>
          <Input
            id="service-hour-estimate"
            type="number"
            min={0}
            step="0.5"
            value={values.hourEstimate}
            onChange={(event) => onChange("hourEstimate", event.target.value)}
            placeholder="0"
            disabled={submitting}
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="service-hourly-rate">Hourly rate</Label>
          <Input
            id="service-hourly-rate"
            type="number"
            min={0}
            step="1"
            value={values.hourlyRate}
            onChange={(event) => onChange("hourlyRate", event.target.value)}
            placeholder="0"
            disabled={submitting}
            required
          />
        </div>
      </div>

      {validationError ? (
        <p className="text-sm text-destructive">{validationError}</p>
      ) : null}
    </div>
  )
}
