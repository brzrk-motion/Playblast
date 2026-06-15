import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { Service } from "@/types/service"

interface DeleteServiceDialogProps {
  service: Service | null
  open: boolean
  onOpenChange: (open: boolean) => void
  linkedProjectNames?: string[]
  loadingUsage?: boolean
  usageError?: string | null
  deleting?: boolean
  onConfirm: () => void
}

export function DeleteServiceDialog({
  service,
  open,
  onOpenChange,
  linkedProjectNames = [],
  loadingUsage = false,
  usageError = null,
  deleting = false,
  onConfirm,
}: DeleteServiceDialogProps) {
  const hasLinkedProjects = linkedProjectNames.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {service ? `Delete ${service.name}?` : "Delete service?"}
          </DialogTitle>
          <DialogDescription>
            This will remove it from any projects it&apos;s been added to.
          </DialogDescription>
        </DialogHeader>

        {loadingUsage ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Checking linked projects…
          </div>
        ) : usageError ? (
          <p className="text-sm text-destructive">{usageError}</p>
        ) : hasLinkedProjects ? (
          <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Used in {linkedProjectNames.length}{" "}
                {linkedProjectNames.length === 1 ? "project" : "projects"}
              </p>
              <p className="text-amber-800/90 dark:text-amber-200/90">
                {linkedProjectNames.join(", ")}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting || loadingUsage || Boolean(usageError)}
            onClick={onConfirm}
          >
            {deleting ? (
              <>
                <Spinner className="size-4" />
                Deleting…
              </>
            ) : (
              "Delete Service"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
