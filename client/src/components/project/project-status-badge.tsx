import { Badge } from "@/components/ui/badge"
import { PROJECT_STATUS_LABELS } from "@/lib/projects"
import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/types/project"

const STATUS_STYLES: Record<ProjectStatus, string> = {
  active: "status-success",
  on_hold: "status-warning",
  completed: "status-pending",
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}
