import { Skeleton } from "@/components/ui/skeleton"

export function CommentsPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading comments…</span>
      <ul className="divide-y" aria-hidden>
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index} className="space-y-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </li>
        ))}
      </ul>
    </div>
  )
}
