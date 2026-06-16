import { parseCommentBodyWithMentions } from "@/lib/mentions"
import { cn } from "@/lib/utils"

export interface CommentBodyProps {
  body: string
  mentionNames?: string[]
  className?: string
}

export function CommentBody({
  body,
  mentionNames = [],
  className,
}: CommentBodyProps) {
  const segments = parseCommentBodyWithMentions(body, mentionNames)

  return (
    <p className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "mention") {
          return (
            <span
              key={`${segment.type}-${index}`}
              className={cn(
                "rounded-sm bg-primary/15 px-1 py-0.5 font-medium text-primary",
              )}
            >
              @{segment.value}
            </span>
          )
        }

        return <span key={`${segment.type}-${index}`}>{segment.value}</span>
      })}
    </p>
  )
}
