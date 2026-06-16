import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Columns3,
  LayoutList,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { PipelineStatusBadge } from "@/components/pipeline/pipeline-status-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { listClients, listProjects } from "@/lib/api"
import { formatCurrency } from "@/lib/budget"
import { clientOptionLabel, clientsById } from "@/lib/clients"
import {
  calculatePipelineRevenueTotals,
  derivePipelineStatus,
  filterPipelineProjects,
  groupProjectsByPipelineStatus,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  projectClientDisplayName,
  projectEstimatedValue,
  summarizePipelineColumn,
  type PipelineStatus,
} from "@/lib/pipeline"
import { humanizeApiError } from "@/lib/toast"
import type { Client } from "@/types/client"
import type { ProjectSummary } from "@/types/project"

type PipelineViewMode = "kanban" | "list"

interface SummaryCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}

function SummaryCard({ title, value, description, icon }: SummaryCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function PipelineProjectCard({
  project,
  clientName,
}: {
  project: ProjectSummary
  clientName?: string
}) {
  const pipelineStatus = derivePipelineStatus(project)
  const estimatedValue = projectEstimatedValue(project)
  const currency = project.budget?.currency ?? "USD"

  return (
    <Link
      to={`/projects/${encodeURIComponent(project.id)}`}
      className="block rounded-xl focus-ring"
    >
      <Card className="interactive-card border-muted">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-sm leading-snug">{project.name}</CardTitle>
          {clientName ? (
            <CardDescription className="truncate">{clientName}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium tabular-nums">
            {formatCurrency(estimatedValue, currency)}
          </p>
          <PipelineStatusBadge status={pipelineStatus} />
        </CardContent>
      </Card>
    </Link>
  )
}

function PipelineKanbanColumn({
  status,
  projects,
  clientLookup,
}: {
  status: PipelineStatus
  projects: ProjectSummary[]
  clientLookup: Map<string, Client>
}) {
  const summary = summarizePipelineColumn(projects)

  return (
    <section className="flex min-h-0 min-w-[16rem] flex-1 flex-col rounded-xl border bg-muted/20">
      <header className="space-y-1 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{PIPELINE_STATUS_LABELS[status]}</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {summary.count} {summary.count === 1 ? "project" : "projects"} ·{" "}
          {formatCurrency(summary.totalValue)}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {projects.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No projects
          </p>
        ) : (
          projects.map((project) => (
            <PipelineProjectCard
              key={project.id}
              project={project}
              clientName={projectClientDisplayName(project, clientLookup)}
            />
          ))
        )}
      </div>
    </section>
  )
}

function PipelineListView({
  projects,
  clientLookup,
}: {
  projects: ProjectSummary[]
  clientLookup: Map<string, Client>
}) {
  const sorted = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const statusDelta =
          PIPELINE_STATUSES.indexOf(derivePipelineStatus(a)) -
          PIPELINE_STATUSES.indexOf(derivePipelineStatus(b))
        if (statusDelta !== 0) {
          return statusDelta
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      }),
    [projects],
  )

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No projects match the current filter.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Estimated value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((project) => {
              const pipelineStatus = derivePipelineStatus(project)
              const currency = project.budget?.currency ?? "USD"

              return (
                <TableRow key={project.id} className="interactive-row">
                  <TableCell>
                    <Link
                      to={`/projects/${encodeURIComponent(project.id)}`}
                      className="font-medium hover:underline focus-ring rounded-sm"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {projectClientDisplayName(project, clientLookup) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <PipelineStatusBadge status={pipelineStatus} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(projectEstimatedValue(project), currency)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function PipelinePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<PipelineViewMode>("kanban")

  const loadData = useCallback(async () => {
    const [projectData, clientData] = await Promise.all([
      listProjects(),
      listClients(),
    ])
    setProjects(projectData)
    setClients(clientData)
    return { projectData, clientData }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await loadData()
      } catch (err) {
        if (!cancelled) {
          setError(humanizeApiError(err, "Failed to load pipeline"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadData])

  const clientLookup = useMemo(() => clientsById(clients), [clients])

  const filteredProjects = useMemo(
    () =>
      filterPipelineProjects(
        projects,
        clientFilter === "all" ? null : clientFilter,
      ),
    [projects, clientFilter],
  )

  const groupedProjects = useMemo(
    () => groupProjectsByPipelineStatus(filteredProjects),
    [filteredProjects],
  )

  const revenueTotals = useMemo(
    () => calculatePipelineRevenueTotals(filteredProjects),
    [filteredProjects],
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Revenue grouped by project stage, based on attached service estimates.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            title="Won"
            value={formatCurrency(revenueTotals.won)}
            description="Approved + completed projects"
            icon={<TrendingUp className="size-4 text-muted-foreground" />}
          />
          <SummaryCard
            title="In Flight"
            value={formatCurrency(revenueTotals.inFlight)}
            description="In progress + pending review"
            icon={<TrendingDown className="size-4 text-muted-foreground" />}
          />
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-[14rem]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {clientOptionLabel(client)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) {
              setViewMode(value as PipelineViewMode)
            }
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <Columns3 className="size-4" />
            Pipeline
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <LayoutList className="size-4" />
            List
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex min-h-[24rem] flex-col gap-4 overflow-x-auto lg:flex-row">
          {PIPELINE_STATUSES.map((status) => (
            <PipelineKanbanColumn
              key={status}
              status={status}
              projects={groupedProjects[status]}
              clientLookup={clientLookup}
            />
          ))}
        </div>
      ) : (
        <PipelineListView
          projects={filteredProjects}
          clientLookup={clientLookup}
        />
      )}
    </div>
  )
}
