import { useCallback } from "react"
import { useMediaRemote, useMediaState } from "@vidstack/react"

import { useVideoFps } from "@/hooks/use-video-fps"
import { DEFAULT_VIDEO_FPS } from "@/lib/video-player-config"
import { stepFrameTime } from "@/lib/timecode"

export function useFrameStep() {
  const remote = useMediaRemote()
  const currentTime = useMediaState("currentTime")
  const duration = useMediaState("duration")
  const detectedFps = useVideoFps()
  const fps = detectedFps ?? DEFAULT_VIDEO_FPS

  const stepFrame = useCallback(
    (direction: -1 | 1) => {
      remote.seek(
        stepFrameTime(currentTime, fps, direction, duration > 0 ? duration : 0),
      )
    },
    [currentTime, duration, fps, remote],
  )

  const stepBackward = useCallback(() => stepFrame(-1), [stepFrame])
  const stepForward = useCallback(() => stepFrame(1), [stepFrame])

  return {
    fps,
    stepBackward,
    stepForward,
  }
}
