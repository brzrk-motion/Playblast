import { Badge } from "@/components/ui/badge"
import { clientCompanyLabel } from "@/lib/clients"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/client"

interface ProjectClientBadgeProps {
  client: Client
  onClick?: (clientId: string) => void
  className?: string
}

export function ProjectClientBadge({
  client,
  onClick,
  className,
}: ProjectClientBadgeProps) {
  const label = `Client: ${clientCompanyLabel(client)}`

  if (!onClick) {
    return (
      <Badge variant="secondary" className={className}>
        {label}
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      asChild
      className={cn("cursor-pointer hover:bg-secondary/80", className)}
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClick(client.id)
        }}
      >
        {label}
      </button>
    </Badge>
  )
}
