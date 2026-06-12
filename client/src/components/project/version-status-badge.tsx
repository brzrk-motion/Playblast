import { Badge } from "@/components/ui/badge"
import { VERSION_STATUS_LABELS } from "@/lib/versions"
import { cn } from "@/lib/utils"
import type { VersionStatus } from "@/types/version"

const STATUS_STYLES: Record<VersionStatus, string> = {
  pending_review: "status-pending [a&]:hover:bg-status-pending-muted",
  needs_revision: "status-warning [a&]:hover:bg-status-warning-muted",
  approved: "status-success [a&]:hover:bg-status-success-muted",
}

interface VersionStatusBadgeProps {
  status: VersionStatus
  className?: string
}

export function VersionStatusBadge({ status, className }: VersionStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_STYLES[status], className)}
    >
      {VERSION_STATUS_LABELS[status]}
    </Badge>
  )
}
