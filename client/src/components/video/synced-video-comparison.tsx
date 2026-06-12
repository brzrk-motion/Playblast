import { useState } from "react"
import { Link2, Unlink } from "lucide-react"

import { ComparisonPane } from "@/components/video/comparison-pane"
import { Button } from "@/components/ui/button"
import { SyncedPlaybackProvider } from "@/context/synced-playback-provider"
import { cn } from "@/lib/utils"
import type { Version } from "@/types/version"

export interface SyncedVideoComparisonProps {
  projectId: string
  deliverableId: string
  versions: Version[]
  leftLabel: string | null
  rightLabel: string | null
  onLeftLabelChange: (label: string) => void
  onRightLabelChange: (label: string) => void
  className?: string
}

export function SyncedVideoComparison({
  projectId,
  deliverableId,
  versions,
  leftLabel,
  rightLabel,
  onLeftLabelChange,
  onRightLabelChange,
  className,
}: SyncedVideoComparisonProps) {
  const [syncLocked, setSyncLocked] = useState(true)

  return (
    <SyncedPlaybackProvider syncLocked={syncLocked}>
      <div className={cn("space-y-4", className)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {syncLocked
              ? "Playback and scrubbing are synced across both panes."
              : "Panes are independent — lock sync to control both together."}
          </p>
          <Button
            type="button"
            variant={syncLocked ? "default" : "outline"}
            size="sm"
            onClick={() => setSyncLocked((current) => !current)}
            aria-pressed={syncLocked}
          >
            {syncLocked ? <Link2 /> : <Unlink />}
            {syncLocked ? "Sync locked" : "Sync unlocked"}
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ComparisonPane
            pane="left"
            projectId={projectId}
            deliverableId={deliverableId}
            versions={versions}
            selectedLabel={leftLabel}
            onSelect={onLeftLabelChange}
          />
          <ComparisonPane
            pane="right"
            projectId={projectId}
            deliverableId={deliverableId}
            versions={versions}
            selectedLabel={rightLabel}
            onSelect={onRightLabelChange}
          />
        </div>
      </div>
    </SyncedPlaybackProvider>
  )
}
