import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface InvoiceClientRequiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddClient: () => void
}

export function InvoiceClientRequiredDialog({
  open,
  onOpenChange,
  onAddClient,
}: InvoiceClientRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Client required</DialogTitle>
          <DialogDescription>
            Link a client to this project before generating an invoice. Client
            name, company, and email will appear on the invoice.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false)
              onAddClient()
            }}
          >
            Add Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
