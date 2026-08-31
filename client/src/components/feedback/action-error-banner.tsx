import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ActionErrorBannerProps {
  message: string
  onDismiss: () => void
  className?: string
}

export function ActionErrorBanner({
  message,
  onDismiss,
  className,
}: ActionErrorBannerProps) {
  return (
    <Card
      className={cn(
        "shrink-0 border-destructive/30 bg-destructive/5",
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <CardContent className="flex items-center justify-between gap-4 py-2">
        <p className="text-sm text-destructive">{message}</p>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </CardContent>
    </Card>
  )
}
