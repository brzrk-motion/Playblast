import { useId } from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Tighter padding for nested panels (e.g. card contents). */
  compact?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed text-center",
        compact ? "p-8" : "py-16",
        className,
      )}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      {icon ? (
        <div className="text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div>
        <p id={titleId} className="font-medium">
          {title}
        </p>
        {description ? (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
