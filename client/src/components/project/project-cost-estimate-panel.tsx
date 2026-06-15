import { Calculator } from "lucide-react"
import { ServiceTypeBadge } from "@/components/services/service-type-badge"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatEstimateCurrency } from "@/lib/budget"
import { calculateProjectCostEstimate, isProjectServiceHoursOverridden } from "@/lib/service-estimate"
import { formatHourEstimate, SERVICE_TYPE_LABELS } from "@/lib/services"
import type { ProjectServiceWithDetails } from "@/types/project-service"

interface ProjectCostEstimatePanelProps {
  projectServices: ProjectServiceWithDetails[]
  currency?: string
}

export function ProjectCostEstimatePanel({
  projectServices,
  currency = "USD",
}: ProjectCostEstimatePanelProps) {
  const estimate = calculateProjectCostEstimate(projectServices)

  return (
    <section
      aria-label="Project cost estimate"
      className="rounded-lg border bg-muted/30"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Calculator className="size-4 text-muted-foreground" />
        <div>
          <h3 className="font-medium">Cost Estimate</h3>
          <p className="text-sm text-muted-foreground">
            Calculated from attached service hours and rates.
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Service</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Line Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimate.lines.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={5}
                className="py-6 text-center text-muted-foreground"
              >
                No services added — total estimate is{" "}
                {formatEstimateCurrency(0, currency)}.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {estimate.lines.map(({ item, hours, lineTotal }) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.service.name}</TableCell>
                  <TableCell>
                    <ServiceTypeBadge type={item.service.type} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        isProjectServiceHoursOverridden(item) ? "italic" : undefined
                      }
                    >
                      {formatHourEstimate(hours)}
                    </span>
                    {isProjectServiceHoursOverridden(item) ? (
                      <Badge
                        variant="secondary"
                        className="ml-2 h-5 px-1.5 text-[10px] uppercase"
                      >
                        Custom
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEstimateCurrency(item.service.hourlyRate, currency)}/hr
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEstimateCurrency(lineTotal, currency)}
                  </TableCell>
                </TableRow>
              ))}
              {estimate.typeSubtotals.map((subtotal) => (
                <TableRow
                  key={subtotal.type}
                  className="border-t bg-muted/20 hover:bg-muted/20"
                >
                  <TableCell
                    colSpan={2}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    {SERVICE_TYPE_LABELS[subtotal.type]} subtotal
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatHourEstimate(subtotal.hours)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatEstimateCurrency(subtotal.lineTotal, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            <TableCell colSpan={4} className="text-base font-semibold">
              Total Estimate
            </TableCell>
            <TableCell className="text-right text-base font-semibold tabular-nums">
              {formatEstimateCurrency(estimate.totalEstimate, currency)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </section>
  )
}
