import { useRef, useState } from "react"
import {
  formatTime,
  useMediaRemote,
  useMediaState,
  useSliderPreview,
} from "@vidstack/react"

import { CommentMarkers } from "@/components/video/comment-markers"
import { Slider } from "@/components/ui/slider"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"

export function VideoVolumeSlider({ className }: { className?: string }) {
  const volume = useMediaState("volume")
  const canSetVolume = useMediaState("canSetVolume")
  const remote = useMediaRemote()

  if (!canSetVolume) return null

  return (
    <Slider
      className={cn("w-24", className)}
      value={[volume * 100]}
      onValueChange={([value]) => {
        remote.changeVolume(value / 100)
      }}
      max={100}
      step={1}
      aria-label="Volume"
    />
  )
}

export function VideoTimeSlider({
  className,
  comments = [],
  enableCommentComposer = true,
}: {
  className?: string
  comments?: Comment[]
  enableCommentComposer?: boolean
}) {
  const currentTime = useMediaState("currentTime")
  const canSeek = useMediaState("canSeek")
  const duration = useMediaState("duration")
  const remote = useMediaRemote()
  const videoPlayer = useVideoPlayer()
  const [dragValue, setDragValue] = useState<number | null>(null)
  const changeCountRef = useRef(0)
  const { previewRootRef, previewRef, previewValue } = useSliderPreview({
    clamp: true,
    offset: 6,
    orientation: "horizontal",
  })
  const previewTime = (previewValue / 100) * duration
  const value =
    dragValue ?? (duration > 0 ? (currentTime / duration) * 100 : 0)

  if (!canSeek || !duration) {
    return <div className={cn("h-1.5 flex-1 rounded-full bg-muted", className)} />
  }

  return (
    <div ref={previewRootRef} className={cn("relative flex-1", className)}>
      <Slider
        value={[value]}
        onPointerDown={() => {
          changeCountRef.current = 0
        }}
        onValueChange={([nextValue]) => {
          changeCountRef.current += 1
          setDragValue(nextValue)
          remote.seeking((nextValue / 100) * duration)
        }}
        onValueCommit={([nextValue]) => {
          const timestamp = (nextValue / 100) * duration
          setDragValue(null)
          remote.seek(timestamp)

          if (enableCommentComposer && changeCountRef.current <= 1) {
            videoPlayer.openComposer(timestamp)
          }
        }}
        max={100}
        step={0.1}
        aria-label="Seek"
      />

      <CommentMarkers
        comments={comments}
        duration={duration}
        onSeek={(timestamp) => {
          remote.seek(timestamp)
          remote.pause()
        }}
      />

      <div
        ref={previewRef}
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity data-[visible]:opacity-100"
      >
        {formatTime(previewTime)}
      </div>
    </div>
  )
}
