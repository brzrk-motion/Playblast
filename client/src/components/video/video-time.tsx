import { useMediaState } from "@vidstack/react"

import { useVideoFps } from "@/hooks/use-video-fps"
import { formatTimecode, timeToFrame } from "@/lib/timecode"
import { cn } from "@/lib/utils"

export function VideoTimeGroup({ className }: { className?: string }) {
  const currentTime = useMediaState("currentTime")
  const duration = useMediaState("duration")
  const fps = useVideoFps()
  const currentFrame = fps ? timeToFrame(currentTime, fps) : null

  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-xs tabular-nums text-white/90",
        className,
      )}
    >
      <span className="type-timestamp text-white">
        {formatTimecode(currentTime)}
        {currentFrame !== null ? (
          <span className="ml-1.5 text-white/60">f{currentFrame}</span>
        ) : null}
      </span>
      <span className="text-white/40">/</span>
      <span className="text-white/60">{formatTimecode(duration)}</span>
    </div>
  )
}
