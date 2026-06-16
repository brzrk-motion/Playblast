import { Archive } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProjectArchivedBadgeProps {
  className?: string
}

export function ProjectArchivedBadge({ className }: ProjectArchivedBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 status-pending opacity-70", className)}
    >
      <Archive className="size-3" aria-hidden />
      Archived
    </Badge>
  )
}
