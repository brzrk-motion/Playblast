import { useState } from "react"
import { formatTime } from "@vidstack/react"

import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"

const MARKER_COLORS = [
  "bg-sky-400 ring-sky-500/60",
  "bg-amber-400 ring-amber-500/60",
  "bg-emerald-400 ring-emerald-500/60",
  "bg-violet-400 ring-violet-500/60",
  "bg-rose-400 ring-rose-500/60",
] as const

function markerColor(index: number) {
  return MARKER_COLORS[index % MARKER_COLORS.length]
}

export interface CommentMarkersProps {
  comments: Comment[]
  duration: number
  onSeek?: (timestamp: number) => void
  className?: string
}

export function CommentMarkers({
  comments,
  duration,
  onSeek,
  className,
}: CommentMarkersProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (!duration || comments.length === 0) return null

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-1/2 z-10 h-0 -translate-y-1/2",
        className,
      )}
      aria-hidden={comments.length === 0}
    >
      {comments.map((comment, index) => {
        const percent = Math.min(100, Math.max(0, (comment.timestamp / duration) * 100))
        const isHovered = hoveredId === comment.id

        return (
          <div
            key={comment.id}
            className="pointer-events-auto absolute -translate-x-1/2"
            style={{ left: `${percent}%` }}
            onMouseEnter={() => setHoveredId(comment.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(comment.id)}
            onBlur={() => setHoveredId(null)}
          >
            <button
              type="button"
              className={cn(
                "block size-2 rounded-full ring-1 transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                markerColor(index),
              )}
              aria-label={`Comment at ${formatTime(comment.timestamp)} by ${comment.author}`}
              onClick={(event) => {
                event.stopPropagation()
                onSeek?.(comment.timestamp)
              }}
            />

            <div
              role="tooltip"
              className={cn(
                "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-48 -translate-x-1/2 rounded-md bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md transition-opacity",
                isHovered ? "opacity-100" : "opacity-0",
              )}
            >
              <p className="text-[10px] font-medium text-muted-foreground">
                {formatTime(comment.timestamp)} · {comment.author}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs">{comment.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
