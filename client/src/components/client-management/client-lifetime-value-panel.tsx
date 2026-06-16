import { formatEstimateCurrency } from "@/lib/budget"
import type { ClientLifetimeValue } from "@/types/client"

interface ClientLifetimeValuePanelProps {
  lifetimeValue: ClientLifetimeValue
}

function ValueRow({
  label,
  amount,
  emphasized = false,
}: {
  label: string
  amount: number
  emphasized?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={emphasized ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
        {label}
      </dt>
      <dd className={emphasized ? "text-sm font-semibold tabular-nums" : "text-sm tabular-nums"}>
        {formatEstimateCurrency(amount)}
      </dd>
    </div>
  )
}

export function ClientLifetimeValuePanel({
  lifetimeValue,
}: ClientLifetimeValuePanelProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Lifetime Value</h3>
        <p className="text-xs text-muted-foreground">
          Estimated from attached services (hours × rate), not invoiced amounts.
        </p>
      </div>

      <dl className="space-y-2 rounded-lg border bg-muted/20 p-4">
        <ValueRow
          label="Total estimated"
          amount={lifetimeValue.totalEstimated}
          emphasized
        />
        <ValueRow
          label="Active (in progress + on hold)"
          amount={lifetimeValue.activeEstimated}
        />
        <ValueRow
          label="Completed"
          amount={lifetimeValue.completedEstimated}
        />
      </dl>
    </section>
  )
}
