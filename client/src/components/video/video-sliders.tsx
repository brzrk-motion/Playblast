import { useRef, useState } from "react"
import {
  useMediaRemote,
  useMediaState,
  useSliderPreview,
} from "@vidstack/react"

import { CommentMarkers } from "@/components/video/comment-markers"
import { Slider } from "@/components/ui/slider"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { useVideoFps } from "@/hooks/use-video-fps"
import { formatTimecode, timeToFrame } from "@/lib/timecode"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"

const hudSliderClass =
  "[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"

export function VideoVolumeSlider({ className }: { className?: string }) {
  const volume = useMediaState("volume")
  const canSetVolume = useMediaState("canSetVolume")
  const remote = useMediaRemote()

  if (!canSetVolume) return null

  return (
    <Slider
      className={cn("w-20", hudSliderClass, className)}
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
  const fps = useVideoFps()
  const [dragValue, setDragValue] = useState<number | null>(null)
  const changeCountRef = useRef(0)
  const { previewRootRef, previewRef, previewValue } = useSliderPreview({
    clamp: true,
    offset: 8,
    orientation: "horizontal",
  })
  const previewTime = (previewValue / 100) * duration
  const value =
    dragValue ?? (duration > 0 ? (currentTime / duration) * 100 : 0)

  if (!canSeek || !duration) {
    return (
      <div
        className={cn("h-1 flex-1 rounded-full bg-white/15", className)}
      />
    )
  }

  const previewFrame =
    fps && previewTime >= 0 ? timeToFrame(previewTime, fps) : null

  return (
    <div ref={previewRootRef} className={cn("relative flex-1 py-1", className)}>
      <Slider
        className={cn("w-full", hudSliderClass)}
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
        step={0.05}
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
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 -translate-x-1/2 rounded-md bg-black/90 px-2 py-1 font-mono text-xs text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity data-[visible]:opacity-100"
      >
        {formatTimecode(previewTime)}
        {previewFrame !== null ? (
          <span className="ml-1.5 text-white/60">f{previewFrame}</span>
        ) : null}
      </div>
    </div>
  )
}
