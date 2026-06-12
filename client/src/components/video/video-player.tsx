import "@vidstack/react/player/styles/base.css"

import { useRef } from "react"
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react"

import { VideoControls } from "@/components/video/video-controls"
import { getVideoUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

export interface VideoPlayerProps {
  projectId: string
  version: string
  filename: string
  title?: string
  className?: string
}

export function VideoPlayer({
  projectId,
  version,
  filename,
  title,
  className,
}: VideoPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null)
  const src = getVideoUrl(projectId, version, filename)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border px-4 py-3">
          <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {projectId} / {version}
          </p>
        </div>
      ) : null}

      <MediaPlayer
        ref={playerRef}
        className="relative aspect-video w-full overflow-hidden bg-black text-white"
        title={title ?? filename}
        src={src}
        playsInline
        crossOrigin
      >
        <MediaProvider />
        <VideoControls />
      </MediaPlayer>
    </div>
  )
}
