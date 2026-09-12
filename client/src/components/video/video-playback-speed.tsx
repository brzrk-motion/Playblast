import { useMediaRemote, useMediaState } from "@vidstack/react"
import { Gauge } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const

function formatPlaybackSpeed(rate: number): string {
  return rate === 1 ? "1x" : `${rate}x`
}

export function VideoPlaybackSpeed({ className }: { className?: string }) {
  const playbackRate = useMediaState("playbackRate")
  const canSetPlaybackRate = useMediaState("canSetPlaybackRate")
  const remote = useMediaRemote()

  if (!canSetPlaybackRate) {
    return null
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          remote.pauseControls()
        } else {
          remote.resumeControls()
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 min-w-11 px-2 font-mono text-xs tabular-nums text-foreground hover:bg-white/10 hover:text-white",
                className,
              )}
              aria-label="Playback speed"
            >
              <Gauge className="mr-1 size-3.5 opacity-70" />
              {formatPlaybackSpeed(playbackRate)}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Playback speed</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="min-w-28">
        <DropdownMenuRadioGroup
          value={String(playbackRate)}
          onValueChange={(value) => {
            remote.changePlaybackRate(Number(value))
          }}
        >
          {PLAYBACK_SPEEDS.map((rate) => (
            <DropdownMenuRadioItem
              key={rate}
              value={String(rate)}
              className="font-mono text-xs tabular-nums"
            >
              {formatPlaybackSpeed(rate)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
