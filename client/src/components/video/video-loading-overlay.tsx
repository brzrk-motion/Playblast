import { useMediaState } from "@vidstack/react"

import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function VideoLoadingOverlay({ className }: { className?: string }) {
  const waiting = useMediaState("waiting")
  const canPlay = useMediaState("canPlay")

  const show = waiting || !canPlay

  if (!show) {
    return null
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/60 transition-opacity duration-150",
        className,
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="size-8 text-white/80" />
      <p className="text-sm text-white/70">Loading video…</p>
      <Skeleton className="absolute inset-x-8 bottom-8 h-1 rounded-full bg-white/20" />
    </div>
  )
}
