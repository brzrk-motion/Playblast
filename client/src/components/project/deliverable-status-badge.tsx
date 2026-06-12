import { Badge } from "@/components/ui/badge"
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_STYLES,
} from "@/lib/deliverables"
import { cn } from "@/lib/utils"
import type { DeliverableStatus } from "@/types/deliverable"

interface DeliverableStatusBadgeProps {
  status: DeliverableStatus
  className?: string
}

export function DeliverableStatusBadge({
  status,
  className,
}: DeliverableStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(DELIVERABLE_STATUS_STYLES[status], className)}
    >
      {DELIVERABLE_STATUS_LABELS[status]}
    </Badge>
  )
}
