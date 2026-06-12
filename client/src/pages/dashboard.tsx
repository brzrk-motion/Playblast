import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { VersionStatusBadge } from "@/components/project/version-status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  countProjectsByStatus,
  filterProjectsByName,
  PROJECT_SORT_LABELS,
  recentlyUpdatedProjects,
  sortProjects,
  totalOpenComments,
  type ProjectSortField,
} from "@/lib/projects"
import { VERSION_STATUS_LABELS } from "@/lib/versions"
import type { ProjectSummary } from "@/types/project"
import type { VersionStatus } from "@/types/version"
import {
  ArrowDownUp,
  CheckCircle2,
  Clock,
  FolderOpen,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react"

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatRelativeDate(value: string): string {
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return "Today"
  }
  if (diffDays === 1) {
    return "Yesterday"
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`
  }

  return formatDate(value)
}

interface ProjectCardProps {
  project: ProjectSummary
  compact?: boolean
}

function ProjectCard({ project, compact = false }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${encodeURIComponent(project.id)}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full border-muted transition-colors hover:border-primary/40 hover:bg-muted/20">
        <CardHeader className={compact ? "gap-2 pb-2" : "pb-3"}>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className={compact ? "text-sm leading-snug" : "text-base leading-snug"}>
              {project.name}
            </CardTitle>
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
          <VersionStatusBadge status={project.status} />
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Updated {formatRelativeDate(project.updatedAt)}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

const STATUS_OVERVIEW: Array<{
  status: VersionStatus
  icon: typeof Clock
  accentClass: string
}> = [
  {
    status: "pending_review",
    icon: Clock,
    accentClass: "text-muted-foreground",
  },
  {
    status: "needs_revision",
    icon: RotateCcw,
    accentClass: "text-amber-600 dark:text-amber-400",
  },
  {
    status: "approved",
    icon: CheckCircle2,
    accentClass: "text-emerald-600 dark:text-emerald-400",
  },
]

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<ProjectSortField>("updatedAt")

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

  const statusCounts = useMemo(() => countProjectsByStatus(projects), [projects])
  const openCommentTotal = useMemo(() => totalOpenComments(projects), [projects])
  const recentProjects = useMemo(() => recentlyUpdatedProjects(projects), [projects])
  const filteredProjects = useMemo(
    () => sortProjects(filterProjectsByName(projects, searchQuery), sortField),
    [projects, searchQuery, sortField],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Good morning</h2>
          <p className="text-muted-foreground">
            Your home for reviews, revisions, and approvals.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadProjects()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Comments</CardTitle>
                <MessageSquare className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openCommentTotal}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across {projects.length}{" "}
                  {projects.length === 1 ? "project" : "projects"}
                </p>
              </CardContent>
            </Card>

            {STATUS_OVERVIEW.map(({ status, icon: Icon, accentClass }) => (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {VERSION_STATUS_LABELS[status]}
                  </CardTitle>
                  <Icon className={`size-4 ${accentClass}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts[status]}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusCounts[status] === 1 ? "project" : "projects"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {projects.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recently Updated</CardTitle>
                <CardDescription>
                  Projects with the latest activity across your workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {recentProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} compact />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>
                Search and sort your project library
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <div className="relative flex-1 sm:min-w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search projects..."
                  className="pl-9"
                  aria-label="Search projects by name"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="shrink-0">
                    <ArrowDownUp />
                    Sort: {PROJECT_SORT_LABELS[sortField]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={sortField}
                    onValueChange={(value) => setSortField(value as ProjectSortField)}
                  >
                    {(Object.keys(PROJECT_SORT_LABELS) as ProjectSortField[]).map((field) => (
                      <DropdownMenuRadioItem key={field} value={field}>
                        {PROJECT_SORT_LABELS[field]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : error ? null : projects.length === 0 ? (
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
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <Search className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No matching projects</p>
                <p className="text-sm text-muted-foreground">
                  Try a different search term or clear the filter.
                </p>
              </div>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
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
