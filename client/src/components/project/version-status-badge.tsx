import { Badge } from "@/components/ui/badge"
import { VERSION_STATUS_LABELS } from "@/lib/versions"
import { cn } from "@/lib/utils"
import type { VersionStatus } from "@/types/version"

const STATUS_STYLES: Record<VersionStatus, string> = {
  pending_review:
    "border-border bg-muted text-muted-foreground [a&]:hover:bg-muted",
  needs_revision:
    "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
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
