import "@vidstack/react/player/styles/base.css"

import { useCallback } from "react"
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react"

import { VersionSelector } from "@/components/project/version-selector"
import { VideoControls } from "@/components/video/video-controls"
import { VideoLoadingOverlay } from "@/components/video/video-loading-overlay"
import { VideoHotkeys } from "@/components/video/video-hotkeys"
import { VideoPlayerProvider } from "@/context/video-player-provider"
import type { ComparePane } from "@/context/synced-playback-context"
import { useSyncedPlayback } from "@/hooks/use-synced-playback"
import { getVideoUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Version } from "@/types/version"

export interface ComparisonPaneProps {
  pane: ComparePane
  projectId: string
  deliverableId: string
  versions: Version[]
  selectedLabel: string | null
  onSelect: (label: string) => void
  className?: string
}

export function ComparisonPane({
  pane,
  projectId,
  deliverableId,
  versions,
  selectedLabel,
  onSelect,
  className,
}: ComparisonPaneProps) {
  const { registerPlayer, handlePlayerEvent } = useSyncedPlayback()
  const selectedVersion =
    versions.find((version) => version.label === selectedLabel) ?? null

  const setPlayerRef = useCallback(
    (instance: MediaPlayerInstance | null) => {
      registerPlayer(pane, instance)
    },
    [pane, registerPlayer],
  )

  if (!selectedVersion) {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/30",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">Select a version</p>
      </div>
    )
  }

  const src = getVideoUrl(
    projectId,
    deliverableId,
    selectedVersion.label,
    selectedVersion.filename,
  )

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium capitalize text-muted-foreground">
          {pane} pane
        </p>
        <VersionSelector
          versions={versions}
          selectedLabel={selectedLabel}
          onSelect={onSelect}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h3 className="truncate text-sm font-medium text-foreground">
            {selectedVersion.label}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {selectedVersion.filename}
          </p>
        </div>

        <MediaPlayer
          key={`${pane}-${selectedVersion.id}-${selectedVersion.uploadedAt}`}
          ref={setPlayerRef}
          className="relative aspect-video w-full overflow-hidden bg-black text-white"
          title={selectedVersion.filename}
          src={src}
          playsInline
          crossOrigin
          controlsDelay={2000}
          onPlay={() => {
            handlePlayerEvent(pane, "play")
          }}
          onPause={() => {
            handlePlayerEvent(pane, "pause")
          }}
          onSeeking={(time) => {
            handlePlayerEvent(pane, "seeking", time)
          }}
          onSeeked={(time) => {
            handlePlayerEvent(pane, "seek", time)
          }}
        >
          <VideoPlayerProvider>
            <MediaProvider />
            <VideoLoadingOverlay />
            <VideoHotkeys
              enableCommentShortcut={false}
              captureShortcuts={pane === "left"}
            />
            <VideoControls enableCommentComposer={false} />
          </VideoPlayerProvider>
        </MediaPlayer>
      </div>
    </div>
  )
}
