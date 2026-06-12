import { CheckCircle2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export interface VideoApprovalActionsProps {
  onMarkNeedsRevision?: () => void
  onMarkApproved?: () => void
  statusUpdating?: boolean
  className?: string
}

export function VideoApprovalActions({
  onMarkNeedsRevision,
  onMarkApproved,
  statusUpdating = false,
  className,
}: VideoApprovalActionsProps) {
  if (!onMarkNeedsRevision && !onMarkApproved) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onMarkNeedsRevision ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={statusUpdating}
          onClick={onMarkNeedsRevision}
          title="Keyboard shortcut: R"
        >
          {statusUpdating ? <Spinner className="size-3.5" /> : <RotateCcw />}
          Needs revision
        </Button>
      ) : null}
      {onMarkApproved ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={statusUpdating}
          onClick={onMarkApproved}
          title="Keyboard shortcut: A"
        >
          {statusUpdating ? <Spinner className="size-3.5" /> : <CheckCircle2 />}
          Approve
        </Button>
      ) : null}
    </div>
  )
}
