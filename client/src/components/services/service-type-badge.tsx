import { Badge } from "@/components/ui/badge"
import { SERVICE_TYPE_LABELS, SERVICE_TYPE_STYLES } from "@/lib/services"
import { cn } from "@/lib/utils"
import type { ServiceType } from "@/types/service"

interface ServiceTypeBadgeProps {
  type: ServiceType
  className?: string
}

export function ServiceTypeBadge({ type, className }: ServiceTypeBadgeProps) {
  return (
    <Badge variant="outline" className={cn(SERVICE_TYPE_STYLES[type], className)}>
      {SERVICE_TYPE_LABELS[type]}
    </Badge>
  )
}
