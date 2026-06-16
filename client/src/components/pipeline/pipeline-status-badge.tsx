import { Badge } from "@/components/ui/badge"
import {
  PIPELINE_STATUS_LABELS,
  PIPELINE_STATUS_STYLES,
  type PipelineStatus,
} from "@/lib/pipeline"
import { cn } from "@/lib/utils"

interface PipelineStatusBadgeProps {
  status: PipelineStatus
  className?: string
}

export function PipelineStatusBadge({
  status,
  className,
}: PipelineStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(PIPELINE_STATUS_STYLES[status], className)}>
      {PIPELINE_STATUS_LABELS[status]}
    </Badge>
  )
}
