import { useState } from "react"

import { markerColorClass } from "@/lib/design-tokens"
import { formatTimecode } from "@/lib/timecode"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/comment"

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
        const percent = Math.min(
          100,
          Math.max(0, (comment.timestamp / duration) * 100),
        )
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
                "block rounded-full ring-1 ring-black/40 transition-interactive hover:scale-125 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-110",
                comment.annotation ? "size-2.5 ring-2" : "size-2",
                markerColorClass(index),
              )}
              aria-label={`${comment.annotation ? "Annotated comment" : "Comment"} at ${formatTimecode(comment.timestamp)} by ${comment.author}`}
              onClick={(event) => {
                event.stopPropagation()
                onSeek?.(comment.timestamp)
              }}
            />

            <div
              role="tooltip"
              className={cn(
                "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 w-max max-w-48 -translate-x-1/2 rounded-md bg-black/90 px-2.5 py-1.5 text-white shadow-lg ring-1 ring-white/10 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0",
              )}
            >
              <p className="type-micro font-medium text-white/70">
                {formatTimecode(comment.timestamp)} · {comment.author}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-white/90">
                {comment.body}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
