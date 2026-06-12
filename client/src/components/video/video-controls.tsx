import { Controls, Gesture } from "@vidstack/react"

import {
  VideoFullscreenButton,
  VideoMuteButton,
  VideoPlayButton,
} from "@/components/video/video-buttons"
import { VideoPlaybackSpeed } from "@/components/video/video-playback-speed"
import { VideoTimeSlider, VideoVolumeSlider } from "@/components/video/video-sliders"
import { VideoTimeGroup } from "@/components/video/video-time"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"

const CONTROLS_HIDE_DELAY_MS = 2000

export function VideoControls({
  className,
  comments = [],
  enableCommentComposer = true,
}: {
  className?: string
  comments?: Comment[]
  enableCommentComposer?: boolean
}) {
  return (
    <>
      <Gesture
        className="absolute inset-0 z-0 block h-full w-full"
        event="pointerup"
        action="toggle:paused"
      />
      <Gesture
        className="absolute inset-0 z-0 block h-full w-full"
        event="dblpointerup"
        action="toggle:fullscreen"
      />

      <Controls.Root
        hideDelay={CONTROLS_HIDE_DELAY_MS}
        className={cn(
          "video-controls absolute inset-x-0 bottom-0 z-20 flex flex-col bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pt-14 pb-3",
          className,
        )}
      >
        <Controls.Group className="flex w-full items-center gap-2">
          <VideoTimeSlider
            comments={comments}
            enableCommentComposer={enableCommentComposer}
          />
        </Controls.Group>

        <Controls.Group className="mt-2.5 flex w-full items-center gap-1.5">
          <VideoPlayButton />
          <VideoMuteButton />
          <VideoVolumeSlider />
          <VideoTimeGroup className="ml-auto" />
          <VideoPlaybackSpeed />
          <VideoFullscreenButton />
        </Controls.Group>
      </Controls.Root>
    </>
  )
}
