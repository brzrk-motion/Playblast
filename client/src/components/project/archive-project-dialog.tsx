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

interface ArchiveProjectDialogProps {
  projectName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  archiving?: boolean
  onConfirm: () => void
}

export function ArchiveProjectDialog({
  projectName,
  open,
  onOpenChange,
  archiving = false,
  onConfirm,
}: ArchiveProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {projectName ? `Archive ${projectName}?` : "Archive this project?"}
          </DialogTitle>
          <DialogDescription>
            Archive this project? It will be hidden from your dashboard.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={archiving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={archiving} onClick={onConfirm}>
            {archiving ? (
              <>
                <Spinner className="size-4" />
                Archiving…
              </>
            ) : (
              "Archive project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
