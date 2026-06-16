import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Gauge } from "lucide-react"
import { CapacityView } from "@/components/capacity/capacity-view"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { listProjects } from "@/lib/api"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import type { ProjectSummary } from "@/types/project"

export function CapacityPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    const data = await listProjects()
    setProjects(data)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchProjects() {
      try {
        await loadProjects()
        if (!cancelled) {
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load projects")
          setError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchProjects()

    return () => {
      cancelled = true
    }
  }, [loadProjects])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" aria-hidden />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/projects">Go to projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-page-title flex items-center gap-2">
          <Gauge className="size-6 text-muted-foreground" />
          Capacity
        </h2>
        <p className="text-muted-foreground">
          Active project workload and estimated hours remaining across the
          studio.
        </p>
      </div>

      <CapacityView projects={projects} />
    </div>
  )
}
