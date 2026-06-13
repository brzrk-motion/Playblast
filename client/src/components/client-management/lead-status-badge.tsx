import { Badge } from "@/components/ui/badge"
import { LEAD_STATUS_LABELS, LEAD_STATUS_STYLES } from "@/lib/leads"
import { cn } from "@/lib/utils"
import type { LeadStatus } from "@/types/lead"

interface LeadStatusBadgeProps {
  status: LeadStatus
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(LEAD_STATUS_STYLES[status], className)}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  )
}
