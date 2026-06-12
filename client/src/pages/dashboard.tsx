import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createProject, listProjects } from "@/lib/api"
import type { ProjectSummary } from "@/types/project"
import { Film, FolderOpen, GitCompare, MessageSquare, Plus, Users } from "lucide-react"

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listProjects()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchProjects() {
      try {
        const data = await listProjects()
        if (!cancelled) {
          setProjects(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load projects")
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
  }, [])

  async function handleCreateProject(event: React.FormEvent) {
    event.preventDefault()

    const name = projectName.trim()
    if (!name) {
      setCreateError("Project name is required.")
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      await createProject({ name })
      setProjectName("")
      setSheetOpen(false)
      await loadProjects()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setCreating(false)
    }
  }

  const stats = [
    {
      title: "Active Reviews",
      value: "—",
      change: "Coming soon",
      icon: Film,
    },
    {
      title: "Comparisons",
      value: "—",
      change: "Coming soon",
      icon: GitCompare,
    },
    {
      title: "Projects",
      value: loading ? "—" : String(projects.length),
      change: projects.length === 1 ? "1 project" : `${projects.length} projects`,
      icon: FolderOpen,
    },
    {
      title: "Team Members",
      value: "—",
      change: "Coming soon",
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Good morning</h2>
          <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>All projects with version counts and last updated dates</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void loadProjects()}>
                Try again
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <FolderOpen className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first project to start uploading and reviewing videos.
                </p>
              </div>
              <Button onClick={() => setSheetOpen(true)}>
                <Plus />
                New Project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${encodeURIComponent(project.id)}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full border-muted transition-colors hover:border-primary/40 hover:bg-muted/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          {project.openCommentCount > 0 ? (
                            <Badge
                              variant="default"
                              className="gap-1"
                              title={`${project.openCommentCount} open ${project.openCommentCount === 1 ? "comment" : "comments"}`}
                            >
                              <MessageSquare className="size-3" />
                              {project.openCommentCount}
                            </Badge>
                          ) : null}
                          <Badge variant="secondary">
                            {project.versionCount}{" "}
                            {project.versionCount === 1 ? "version" : "versions"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>Updated {formatDate(project.updatedAt)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <form onSubmit={(event) => void handleCreateProject(event)} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>New Project</SheetTitle>
              <SheetDescription>
                Give your project a name to start organizing video versions and reviews.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 px-4">
              <div className="space-y-2">
                <label htmlFor="project-name" className="text-sm font-medium">
                  Project name
                </label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="e.g. Hero Spot Q3"
                  autoFocus
                  disabled={creating}
                  aria-invalid={createError ? true : undefined}
                />
                {createError ? (
                  <p className="text-sm text-destructive">{createError}</p>
                ) : null}
              </div>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
