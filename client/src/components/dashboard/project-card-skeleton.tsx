import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProjectCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="h-full border-muted" aria-hidden>
      <CardHeader className={compact ? "gap-2 pb-2" : "pb-3"}>
        <div className="flex items-start justify-between gap-2">
          <Skeleton className={compact ? "h-4 w-28" : "h-5 w-36"} />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  )
}
