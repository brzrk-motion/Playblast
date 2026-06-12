import { useEffect, useState } from "react"
import { useMediaPlayer, useMediaState } from "@vidstack/react"

import { frameDuration } from "@/lib/timecode"

const SAMPLE_TARGET = 30
const FALLBACK_FPS = 24

/**
 * Estimates video frame rate via requestVideoFrameCallback when available.
 * Returns null until a stable rate is detected.
 */
export function useVideoFps(): number | null {
  const player = useMediaPlayer()
  const canPlay = useMediaState("canPlay")
  const [fps, setFps] = useState<number | null>(null)

  useEffect(() => {
    if (!canPlay || !player?.el) {
      return
    }

    const video = player.el.querySelector("video")
    if (!(video instanceof HTMLVideoElement)) {
      return
    }

    if (!("requestVideoFrameCallback" in video)) {
      return
    }

    let cancelled = false
    const samples: number[] = []
    let lastMediaTime = -1
    let lastFrame = -1
    let frameSeeked = true

    const onSeeked = () => {
      if (samples.length > 0) {
        samples.pop()
      }
      frameSeeked = false
    }

    video.addEventListener("seeked", onSeeked)

    const tick = (
      _now: number,
      metadata: VideoFrameCallbackMetadata,
    ) => {
      if (cancelled) {
        return
      }

      const mediaTimeDiff = Math.abs(metadata.mediaTime - lastMediaTime)
      const frameDiff = Math.abs(metadata.presentedFrames - lastFrame)

      if (
        frameSeeked &&
        mediaTimeDiff > 0 &&
        frameDiff > 0 &&
        video.playbackRate === 1 &&
        !video.seeking
      ) {
        const sampleDuration = mediaTimeDiff / frameDiff
        if (sampleDuration > 0 && sampleDuration < 1) {
          samples.push(sampleDuration)
          if (samples.length >= SAMPLE_TARGET) {
            const average =
              samples.reduce((sum, value) => sum + value, 0) / samples.length
            const estimated = Math.round(1 / average)
            if (estimated > 0 && estimated <= 120) {
              setFps(estimated)
            }
            return
          }
        }
      }

      frameSeeked = true
      lastMediaTime = metadata.mediaTime
      lastFrame = metadata.presentedFrames
      video.requestVideoFrameCallback(tick)
    }

    const handle = video.requestVideoFrameCallback(tick)

    return () => {
      cancelled = true
      video.removeEventListener("seeked", onSeeked)
      video.cancelVideoFrameCallback(handle)
    }
  }, [canPlay, player])

  return canPlay ? fps : null
}

export function useFrameDuration(): number {
  const detectedFps = useVideoFps()
  return frameDuration(detectedFps ?? FALLBACK_FPS)
}
