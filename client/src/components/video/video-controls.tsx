import { Controls, Gesture } from "@vidstack/react"

import {
  VideoFullscreenButton,
  VideoMuteButton,
  VideoPlayButton,
} from "@/components/video/video-buttons"
import { VideoTimeSlider, VideoVolumeSlider } from "@/components/video/video-sliders"
import { VideoTimeGroup } from "@/components/video/video-time"
import { cn } from "@/lib/utils"

export function VideoControls({ className }: { className?: string }) {
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
      <Gesture
        className="absolute inset-x-0 top-0 z-10 block h-1/5 w-full"
        event="pointerup"
        action="toggle:controls"
      />
      <Gesture
        className="absolute inset-x-0 bottom-0 z-10 block h-2/5 w-full"
        event="pointerup"
        action="toggle:controls"
      />

      <Controls.Root
        className={cn(
          "video-controls absolute inset-x-0 bottom-0 z-20 flex flex-col bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pt-12 pb-3",
          className,
        )}
      >
        <Controls.Group className="flex w-full items-center gap-2">
          <VideoTimeSlider />
        </Controls.Group>

        <Controls.Group className="mt-2 flex w-full items-center gap-2">
          <VideoPlayButton />
          <VideoMuteButton />
          <VideoVolumeSlider />
          <VideoTimeGroup className="ml-auto" />
          <VideoFullscreenButton />
        </Controls.Group>
      </Controls.Root>
    </>
  )
}
