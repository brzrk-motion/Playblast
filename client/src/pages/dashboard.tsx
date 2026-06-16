import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  MessageSquare,
  Wallet,
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
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardProjectCard } from "@/components/dashboard/project-card"
import { listProjects } from "@/lib/api"
import {
  budgetHealth,
  formatCurrency,
} from "@/lib/budget"
import {
  countDeliverablesInReview,
  countProjectsByStatus,
  recentlyUpdatedProjects,
  totalOpenComments,
} from "@/lib/projects"
import { getTimeOfDayGreeting } from "@/lib/greeting"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import type { ProjectSummary } from "@/types/project"

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface Deadline {
  projectId: string
  projectName: string
  label: string
  dueDate: string
}

interface StatCardProps {
  title: string
  icon: React.ReactNode
  value: number | string
  description: string
  to?: string
}

function StatCard({ title, icon, value, description, to }: StatCardProps) {
  const card = (
    <Card className="interactive-card h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )

  if (to) {
    return (
      <Link to={to} className="block rounded-xl focus-ring">
        {card}
      </Link>
    )
  }

  return card
}

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const greeting = useMemo(() => getTimeOfDayGreeting(), [])

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

  const statusCounts = useMemo(() => countProjectsByStatus(projects), [projects])
  const openComments = useMemo(() => totalOpenComments(projects), [projects])
  const inReview = useMemo(() => countDeliverablesInReview(projects), [projects])
  const recentProjects = useMemo(
    () => recentlyUpdatedProjects(projects),
    [projects],
  )

  const budgetAttention = useMemo(
    () =>
      projects.filter((project) => {
        if (!project.budget) return false
        const health = budgetHealth(project.budget)
        return health === "warning" || health === "over"
      }),
    [projects],
  )

  const upcomingDeadlines = useMemo<Deadline[]>(() => {
    const today = new Date().toISOString().slice(0, 10)
    const deadlines: Deadline[] = []

    for (const project of projects) {
      if (project.nextMilestone?.dueDate) {
        deadlines.push({
          projectId: project.id,
          projectName: project.name,
          label: project.nextMilestone.name,
          dueDate: project.nextMilestone.dueDate,
        })
      }
      if (project.endDate) {
        deadlines.push({
          projectId: project.id,
          projectName: project.name,
          label: "Project deadline",
          dueDate: project.endDate,
        })
      }
    }

    return deadlines
      .filter((deadline) => deadline.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
  }, [projects])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" aria-hidden />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
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
        <h2 className="type-page-title">{greeting}</h2>
        <p className="text-muted-foreground">
          Portfolio health across budgets, deadlines, and approvals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          icon={<FolderKanban className="size-4 text-muted-foreground" />}
          value={statusCounts.active}
          description={`${projects.length} total in portfolio`}
          to="/projects?filter=active"
        />
        <StatCard
          title="Deliverables in Review"
          icon={<CheckCircle2 className="size-4 text-status-warning-foreground" />}
          value={inReview}
          description="Awaiting creative approval"
          to="/projects"
        />
        <StatCard
          title="Open Comments"
          icon={<MessageSquare className="size-4 text-muted-foreground" />}
          value={openComments}
          description="Across all deliverables"
          to="/projects?filter=open_comments"
        />
        <StatCard
          title="Budget Attention"
          icon={<Wallet className="size-4 text-status-warning-foreground" />}
          value={budgetAttention.length}
          description="Projects near or over budget"
          to="/projects"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>
              The next milestones and project end dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
              <ul className="space-y-1">
                {upcomingDeadlines.map((deadline, index) => (
                  <li key={`${deadline.projectId}-${index}`}>
                    <Link
                      to={`/projects/${encodeURIComponent(deadline.projectId)}`}
                      className="interactive-row flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 focus-ring"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {deadline.label}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {deadline.projectName}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(deadline.dueDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming deadlines.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-muted-foreground" />
              Budget Health
            </CardTitle>
            <CardDescription>
              Projects approaching or exceeding their budget.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgetAttention.length > 0 ? (
              <ul className="space-y-1">
                {budgetAttention.slice(0, 5).map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${encodeURIComponent(project.id)}`}
                      className="interactive-row flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 focus-ring"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {project.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {project.budget
                            ? `${formatCurrency(project.budget.spent ?? 0, project.budget.currency)} / ${formatCurrency(project.budget.total, project.budget.currency)}`
                            : null}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-destructive/40 bg-destructive/10 text-destructive"
                      >
                        {project.budget && budgetHealth(project.budget) === "over"
                          ? "Over"
                          : "Near"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                All projects are on budget.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently Updated</CardTitle>
          <CardDescription>
            Projects with the latest activity across your portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentProjects.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {recentProjects.map((project) => (
                <DashboardProjectCard
                  key={project.id}
                  projectId={project.id}
                  name={project.name}
                  status={project.status}
                  clientName={project.clientName}
                  budget={project.budget}
                  servicesEstimate={project.servicesEstimate}
                  servicesEstimatedHours={project.servicesEstimatedHours}
                  deliverableCount={project.deliverableCount}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <FolderKanban className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first project to start planning work.
                </p>
              </div>
              <Button asChild>
                <Link to="/projects">Go to projects</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
