import { Time } from "@vidstack/react"

import { cn } from "@/lib/utils"

export function VideoTimeGroup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1 text-xs tabular-nums text-muted-foreground", className)}>
      <Time type="current" />
      <span>/</span>
      <Time type="duration" />
    </div>
  )
}
