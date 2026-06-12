import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  HELP_SHORTCUT,
  PLAYBACK_SHORTCUTS,
  REVIEW_SHORTCUTS,
  type KeyboardShortcut,
} from "@/lib/video-shortcuts"

function ShortcutRow({ keys, description }: KeyboardShortcut) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex shrink-0 items-center gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="inline-flex min-w-7 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}

function ShortcutSection({
  title,
  shortcuts,
}: {
  title: string
  shortcuts: KeyboardShortcut[]
}) {
  if (shortcuts.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h3>
      <div className="divide-y divide-border">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.description} {...shortcut} />
        ))}
      </div>
    </div>
  )
}

export interface KeyboardShortcutsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  showReviewShortcuts?: boolean
}

export function KeyboardShortcutsPanel({
  open,
  onOpenChange,
  showReviewShortcuts = true,
}: KeyboardShortcutsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Power-user controls for video review. Shortcuts are disabled while
            typing in a text field.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ShortcutSection title="Playback" shortcuts={PLAYBACK_SHORTCUTS} />
          {showReviewShortcuts ? (
            <ShortcutSection title="Review" shortcuts={REVIEW_SHORTCUTS} />
          ) : null}
          <ShortcutSection title="Help" shortcuts={[HELP_SHORTCUT]} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
