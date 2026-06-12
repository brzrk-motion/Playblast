import {
  FullscreenButton,
  MuteButton,
  PlayButton,
  useMediaState,
} from "@vidstack/react"
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const controlButtonClass =
  "size-9 text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80"

interface VideoControlButtonProps {
  label: string
}

function VideoControlButton({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & VideoControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(controlButtonClass, className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export function VideoPlayButton() {
  const isPaused = useMediaState("paused")

  return (
    <PlayButton asChild>
      <VideoControlButton label={isPaused ? "Play" : "Pause"}>
        {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
      </VideoControlButton>
    </PlayButton>
  )
}

export function VideoMuteButton() {
  const volume = useMediaState("volume")
  const isMuted = useMediaState("muted")

  const icon =
    isMuted || volume === 0 ? (
      <VolumeX className="size-4" />
    ) : volume < 0.5 ? (
      <Volume1 className="size-4" />
    ) : (
      <Volume2 className="size-4" />
    )

  return (
    <MuteButton asChild>
      <VideoControlButton label={isMuted ? "Unmute" : "Mute"}>
        {icon}
      </VideoControlButton>
    </MuteButton>
  )
}

export function VideoFullscreenButton() {
  const isFullscreen = useMediaState("fullscreen")

  return (
    <FullscreenButton asChild>
      <VideoControlButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
        {isFullscreen ? (
          <Minimize className="size-4" />
        ) : (
          <Maximize className="size-4" />
        )}
      </VideoControlButton>
    </FullscreenButton>
  )
}
