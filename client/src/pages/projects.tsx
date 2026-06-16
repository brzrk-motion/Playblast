import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowDownUp,
  FolderOpen,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { ProjectCardSkeleton } from "@/components/dashboard/project-card-skeleton"
import { ClientDetailSheet } from "@/components/client-management/client-detail-sheet"
import { ProjectActionsMenu } from "@/components/project/project-actions-menu"
import { ProjectClientBadge } from "@/components/project/project-client-badge"
import { ProjectStatusBadge } from "@/components/project/project-status-badge"
import { ProjectFormSheet } from "@/components/project/project-form-sheet"
import {
  projectFormToPayload,
  type ProjectFormValues,
} from "@/lib/project-form"
import { createProject, listClients, listProjects } from "@/lib/api"
import { clientsById } from "@/lib/clients"
import { formatCurrency } from "@/lib/budget"
import {
  DASHBOARD_FILTER_PARAM,
  filterProjectsByDashboardFilter,
  filterProjectsByName,
  getDashboardFilterLabel,
  parseDashboardFilterFromSearchParams,
  PROJECT_SORT_LABELS,
  sortProjects,
  type ProjectSortField,
} from "@/lib/projects"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { Client } from "@/types/client"
import type { ProjectSummary } from "@/types/project"

function formatRelativeDate(value: string): string {
  const date = new Date(value)
  const diffDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function ProjectCard({
  project,
  linkedClient,
  onClientClick,
}: {
  project: ProjectSummary
  linkedClient?: Client
  onClientClick: (clientId: string) => void
}) {
  return (
    <Card className="interactive-card relative h-full border-muted">
      <div className="absolute top-3 right-3 z-10">
        <ProjectActionsMenu
          projectId={project.id}
          projectName={project.name}
        />
      </div>
      <Link
        to={`/projects/${encodeURIComponent(project.id)}`}
        className="block rounded-xl focus-ring"
      >
        <CardHeader className="pb-3 pr-10">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug">
                {project.name}
              </CardTitle>
              {linkedClient ? (
                <div className="mt-1">
                  <ProjectClientBadge
                    client={linkedClient}
                    onClick={onClientClick}
                  />
                </div>
              ) : project.client ? (
                <p className="truncate text-sm text-muted-foreground">
                  {project.client}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {project.openCommentCount > 0 ? (
                <Badge variant="default" className="gap-1">
                  <MessageSquare className="size-3" />
                  {project.openCommentCount}
                </Badge>
              ) : null}
              <Badge variant="secondary">
                {project.deliverableCount}{" "}
                {project.deliverableCount === 1 ? "deliverable" : "deliverables"}
              </Badge>
            </div>
          </div>
          <ProjectStatusBadge status={project.status} />
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {project.budget ? (
            <p>
              {formatCurrency(project.budget.spent ?? 0, project.budget.currency)}{" "}
              / {formatCurrency(project.budget.total, project.budget.currency)}
            </p>
          ) : null}
          <p>Updated {formatRelativeDate(project.updatedAt)}</p>
        </CardContent>
      </Link>
    </Card>
  )
}

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<ProjectSortField>("updatedAt")
  const [viewClientId, setViewClientId] = useState<string | null>(null)

  const clientLookup = useMemo(() => clientsById(clients), [clients])

  const activeFilter = useMemo(
    () => parseDashboardFilterFromSearchParams(searchParams),
    [searchParams],
  )

  const clearFilter = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete(DASHBOARD_FILTER_PARAM)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const loadProjects = useCallback(async () => {
    try {
      const [projectData, clientData] = await Promise.all([
        listProjects(),
        listClients(),
      ])
      setProjects(projectData)
      setClients(clientData)
      setError(null)
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load projects")
      setError(message)
      showErrorToast(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchProjects() {
      try {
        const [projectData, clientData] = await Promise.all([
          listProjects(),
          listClients(),
        ])
        if (!cancelled) {
          setProjects(projectData)
          setClients(clientData)
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
  }, [])

  async function handleCreateProject(values: ProjectFormValues) {
    const payload = projectFormToPayload(values)
    if (!payload.name) {
      setCreateError("Project name is required.")
      return
    }

    setCreating(true)
    setCreateError(null)
    try {
      await createProject({
        name: payload.name,
        status: payload.status,
        clientId: payload.clientId ?? undefined,
        description: payload.description ?? undefined,
        startDate: payload.startDate ?? undefined,
        endDate: payload.endDate ?? undefined,
        budget: payload.budget ?? undefined,
      })
      setSheetOpen(false)
      showSuccessToast("Project created")
      await loadProjects()
    } catch (err) {
      const message = humanizeApiError(err, "Failed to create project")
      setCreateError(message)
      showErrorToast(message)
    } finally {
      setCreating(false)
    }
  }

  const filteredProjects = useMemo(
    () =>
      sortProjects(
        filterProjectsByDashboardFilter(
          filterProjectsByName(projects, searchQuery, clientLookup),
          activeFilter,
        ),
        sortField,
      ),
    [projects, searchQuery, sortField, activeFilter, clientLookup],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="type-page-title">Projects</h2>
          <p className="text-muted-foreground">
            Every engagement, its budget, timeline, and deliverables.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus />
          New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>
                {activeFilter
                  ? `Showing ${getDashboardFilterLabel(activeFilter)}`
                  : "Search and sort your project portfolio"}
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <div className="relative flex-1 sm:min-w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault()
                      setSearchQuery("")
                    }
                  }}
                  placeholder="Search projects..."
                  className="pl-9"
                  aria-label="Search projects by name or client"
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
                    onValueChange={(value) =>
                      setSortField(value as ProjectSortField)
                    }
                  >
                    {(Object.keys(PROJECT_SORT_LABELS) as ProjectSortField[]).map(
                      (field) => (
                        <DropdownMenuRadioItem key={field} value={field}>
                          {PROJECT_SORT_LABELS[field]}
                        </DropdownMenuRadioItem>
                      ),
                    )}
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
                <ProjectCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true)
                  setError(null)
                  void loadProjects()
                }}
              >
                Try again
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <FolderOpen className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first project to start planning and reviewing work.
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
                  Try a different search term or clear the active filter.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {searchQuery ? (
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                ) : null}
                {activeFilter ? (
                  <Button variant="outline" onClick={clearFilter}>
                    Clear filter
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  linkedClient={
                    project.clientId
                      ? clientLookup.get(project.clientId)
                      : undefined
                  }
                  onClientClick={setViewClientId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="create"
        submitting={creating}
        error={createError}
        onSubmit={handleCreateProject}
      />

      <ClientDetailSheet
        clientId={viewClientId}
        open={viewClientId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewClientId(null)
          }
        }}
      />
    </div>
  )
}
