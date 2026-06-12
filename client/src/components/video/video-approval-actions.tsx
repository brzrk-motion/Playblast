import { useState } from "react"
import { CheckCircle2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export interface VideoApprovalActionsProps {
  onMarkNeedsRevision?: () => void
  onMarkApproved?: () => void
  approveConfirmOpen?: boolean
  onApproveConfirmOpenChange?: (open: boolean) => void
  statusUpdating?: boolean
  className?: string
}

export function VideoApprovalActions({
  onMarkNeedsRevision,
  onMarkApproved,
  approveConfirmOpen,
  onApproveConfirmOpenChange,
  statusUpdating = false,
  className,
}: VideoApprovalActionsProps) {
  const [approveConfirmOpenInternal, setApproveConfirmOpenInternal] =
    useState(false)

  const isApproveConfirmOpen = approveConfirmOpen ?? approveConfirmOpenInternal
  const setApproveConfirmOpen =
    onApproveConfirmOpenChange ?? setApproveConfirmOpenInternal

  if (!onMarkNeedsRevision && !onMarkApproved) {
    return null
  }

  function handleApproveConfirm() {
    onMarkApproved?.()
    setApproveConfirmOpen(false)
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
        <Popover
          open={isApproveConfirmOpen}
          onOpenChange={setApproveConfirmOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={statusUpdating}
              title="Keyboard shortcut: A"
            >
              {statusUpdating ? (
                <Spinner className="size-3.5" />
              ) : (
                <CheckCircle2 />
              )}
              Approve
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <PopoverHeader className="gap-2">
              <PopoverTitle>Approve this version?</PopoverTitle>
              <p className="text-xs text-muted-foreground">
                This status change cannot be undone.
              </p>
            </PopoverHeader>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApproveConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={statusUpdating}
                onClick={handleApproveConfirm}
              >
                Confirm
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}
