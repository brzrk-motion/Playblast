import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Film,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
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
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeliverableStatusBadge } from "@/components/project/deliverable-status-badge"
import { EditableProjectName } from "@/components/project/editable-project-name"
import { ProjectActionsMenu } from "@/components/project/project-actions-menu"
import { ProjectClientInfoBlock } from "@/components/project/project-client-info-block"
import { ProjectStatusBadge } from "@/components/project/project-status-badge"
import { ClientDetailSheet } from "@/components/client-management/client-detail-sheet"
import {
  DeliverableDialog,
  type DeliverableFormValues,
} from "@/components/project/deliverable-dialog"
import { ProjectBudgetEstimatePanel } from "@/components/project/project-budget-estimate-panel"
import { ProjectInvoicesSection } from "@/components/project/project-invoices-section"
import { ProjectFormSheet } from "@/components/project/project-form-sheet"
import { ProjectNotesField } from "@/components/project/project-notes-field"
import { ProjectServicesSection } from "@/components/project/project-services-section"
import {
  projectFormToPayload,
  type ProjectFormValues,
} from "@/lib/project-form"
import {
  createDeliverable,
  createMilestone,
  deleteDeliverable,
  deleteMilestone,
  listDeliverables,
  listMilestones,
  listProjectServices,
  getProject,
  updateDeliverable,
  updateMilestone,
  updateProject,
} from "@/lib/api"
import {
  BUDGET_HEALTH_LABELS,
  BUDGET_HEALTH_STYLES,
  budgetHealth,
  budgetSpentRatio,
  formatCurrency,
  formatEstimateCurrency,
} from "@/lib/budget"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { useProjectPageHeader } from "@/hooks/use-project-page-header"
import type { DeliverableSummary } from "@/types/deliverable"
import type { Milestone } from "@/types/milestone"
import type { ProjectDetail } from "@/types/project"
import type { ProjectServiceWithDetails } from "@/types/project-service"

const TAB_PARAM = "tab"
const EDIT_NAME_PARAM = "editName"
type ProjectOverviewTab = "milestones" | "deliverables" | "services"

function parseTab(value: string | null): ProjectOverviewTab {
  if (value === "deliverables" || value === "services") return value
  return "milestones"
}

function formatDate(value?: string): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ProjectOverviewPage() {
  const { projectId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = parseTab(searchParams.get(TAB_PARAM))
  const shouldEditName = searchParams.get(EDIT_NAME_PARAM) === "1"
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [deliverables, setDeliverables] = useState<DeliverableSummary[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [projectServices, setProjectServices] = useState<ProjectServiceWithDetails[]>(
    [],
  )
  const [servicesLoading, setServicesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)

  const [deliverableDialogOpen, setDeliverableDialogOpen] = useState(false)
  const [editingDeliverable, setEditingDeliverable] =
    useState<DeliverableSummary | null>(null)
  const [savingDeliverable, setSavingDeliverable] = useState(false)
  const [deliverableError, setDeliverableError] = useState<string | null>(null)

  const [newMilestoneName, setNewMilestoneName] = useState("")
  const [newMilestoneDate, setNewMilestoneDate] = useState("")
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [viewClientId, setViewClientId] = useState<string | null>(null)
  const [outstandingBalance, setOutstandingBalance] = useState(0)
  const [clientLinkOpen, setClientLinkOpen] = useState(false)
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0)

  useProjectPageHeader(projectId, project)

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === "milestones") {
      next.delete(TAB_PARAM)
    } else {
      next.set(TAB_PARAM, value)
    }
    setSearchParams(next, { replace: true })
  }

  function clearEditNameParam() {
    if (!searchParams.has(EDIT_NAME_PARAM)) {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete(EDIT_NAME_PARAM)
    setSearchParams(next, { replace: true })
  }

  const loadData = useCallback(async () => {
    if (!projectId) return

    try {
      const [projectData, deliverableData, milestoneData, servicesData] =
        await Promise.all([
          getProject(projectId),
          listDeliverables(projectId),
          listMilestones(projectId),
          listProjectServices(projectId),
        ])
      setProject(projectData)
      setOutstandingBalance(projectData.outstandingBalance ?? 0)
      setDeliverables(deliverableData)
      setMilestones(milestoneData)
      setProjectServices(servicesData)
      setError(null)
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load project")
      setError(message)
      showErrorToast(message)
      setProject(null)
    } finally {
      setLoading(false)
      setServicesLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return

    let cancelled = false

    async function fetchData() {
      try {
        const [projectData, deliverableData, milestoneData, servicesData] =
          await Promise.all([
            getProject(projectId),
            listDeliverables(projectId),
            listMilestones(projectId),
            listProjectServices(projectId),
          ])
        if (!cancelled) {
          setProject(projectData)
          setOutstandingBalance(projectData.outstandingBalance ?? 0)
          setDeliverables(deliverableData)
          setMilestones(milestoneData)
          setProjectServices(servicesData)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load project")
          setError(message)
          showErrorToast(message)
          setProject(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setServicesLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [projectId])

  async function handleSaveProject(values: ProjectFormValues) {
    if (!project) return
    const payload = projectFormToPayload(values)
    if (!payload.name) {
      setProjectError("Project name is required.")
      return
    }

    setSavingProject(true)
    setProjectError(null)
    try {
      await updateProject(project.id, payload)
      const refreshed = await getProject(project.id)
      setProject(refreshed)
      setEditOpen(false)
      showSuccessToast("Project updated")
    } catch (err) {
      const message = humanizeApiError(err, "Failed to update project")
      setProjectError(message)
      showErrorToast(message)
    } finally {
      setSavingProject(false)
    }
  }

  async function handleSaveDeliverable(values: DeliverableFormValues) {
    if (!project) return
    if (!values.name.trim()) {
      setDeliverableError("Deliverable name is required.")
      return
    }

    setSavingDeliverable(true)
    setDeliverableError(null)
    try {
      if (editingDeliverable) {
        await updateDeliverable(editingDeliverable.id, {
          name: values.name.trim(),
          description: values.description.trim() || null,
          status: values.status,
          dueDate: values.dueDate || null,
        })
        showSuccessToast("Deliverable updated")
      } else {
        await createDeliverable(project.id, {
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          status: values.status,
          dueDate: values.dueDate || undefined,
        })
        showSuccessToast("Deliverable created")
      }
      setDeliverableDialogOpen(false)
      setEditingDeliverable(null)
      await loadData()
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save deliverable")
      setDeliverableError(message)
      showErrorToast(message)
    } finally {
      setSavingDeliverable(false)
    }
  }

  async function handleDeleteDeliverable(id: string) {
    try {
      await deleteDeliverable(id)
      setDeliverables((current) => current.filter((item) => item.id !== id))
      showSuccessToast("Deliverable deleted")
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete deliverable"))
    }
  }

  async function handleAddMilestone(event: React.FormEvent) {
    event.preventDefault()
    if (!project || !newMilestoneName.trim()) return

    setAddingMilestone(true)
    try {
      const milestone = await createMilestone(project.id, {
        name: newMilestoneName.trim(),
        dueDate: newMilestoneDate || undefined,
      })
      setMilestones((current) => [...current, milestone])
      setNewMilestoneName("")
      setNewMilestoneDate("")
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to add milestone"))
    } finally {
      setAddingMilestone(false)
    }
  }

  async function handleToggleMilestone(milestone: Milestone) {
    try {
      const updated = await updateMilestone(milestone.id, { done: !milestone.done })
      setMilestones((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to update milestone"))
    }
  }

  async function handleDeleteMilestone(id: string) {
    try {
      await deleteMilestone(id)
      setMilestones((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete milestone"))
    }
  }

  const sortedMilestones = useMemo(
    () =>
      [...milestones].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return a.order - b.order
      }),
    [milestones],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/projects">
            <ArrowLeft />
            Back to projects
          </Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Project unavailable</CardTitle>
            <CardDescription className="text-destructive">
              {error ?? "Project not found."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true)
                setError(null)
                void loadData()
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const budget = project.budget
  const health = budget ? budgetHealth(budget) : null
  const currency = budget?.currency ?? "USD"

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to="/projects">
            <ArrowLeft />
            Back to projects
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <EditableProjectName
                projectId={project.id}
                name={project.name}
                autoFocus={shouldEditName}
                onNameChange={(name) => setProject({ ...project, name })}
                onEditEnd={clearEditNameParam}
              />
              <ProjectStatusBadge status={project.status} />
              {outstandingBalance > 0 ? (
                <Badge
                  variant="outline"
                  className="border-destructive/40 text-destructive"
                >
                  {formatEstimateCurrency(outstandingBalance, currency)} outstanding
                </Badge>
              ) : null}
            </div>
            {project.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ProjectActionsMenu
              projectId={project.id}
              projectName={project.name}
            />
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit project
            </Button>
          </div>
        </div>
        <ProjectClientInfoBlock
          projectId={project.id}
          client={project.client}
          onViewClient={setViewClientId}
          onProjectUpdated={setProject}
          linkDialogOpen={clientLinkOpen}
          onLinkDialogOpenChange={setClientLinkOpen}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {budget ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold">
                    {formatCurrency(budget.spent ?? 0, budget.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {formatCurrency(budget.total, budget.currency)}
                  </span>
                </div>
                <Progress value={Math.min(100, budgetSpentRatio(budget) * 100)} />
                {health ? (
                  <Badge
                    variant="outline"
                    className={cn("mt-1", BUDGET_HEALTH_STYLES[health])}
                  >
                    {BUDGET_HEALTH_LABELS[health]}
                  </Badge>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No budget set. Edit the project to add one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start</span>
              <span className="font-medium">{formatDate(project.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End</span>
              <span className="font-medium">{formatDate(project.endDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliverables</CardTitle>
            <Film className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliverables.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {deliverables.filter((d) => d.status === "approved").length} approved ·{" "}
              {deliverables.filter((d) => d.status === "in_review").length} in review
            </p>
          </CardContent>
        </Card>
      </div>

      <ProjectNotesField
        notes={project.notes}
        onSave={async (notes) => {
          const updated = await updateProject(project.id, { notes })
          setProject((current) =>
            current ? { ...current, notes: updated.notes } : current,
          )
        }}
      />

      <ProjectBudgetEstimatePanel
        projectId={project.id}
        projectServices={projectServices}
        budget={project.budget}
        loading={servicesLoading}
        outstandingBalance={outstandingBalance}
        currency={currency}
        hasClient={project.client !== null}
        onRequestClientLink={() => setClientLinkOpen(true)}
        onInvoiceCreated={() => setInvoiceRefreshKey((key) => key + 1)}
      />

      <ProjectInvoicesSection
        key={invoiceRefreshKey}
        projectId={project.id}
        currency={currency}
        refreshKey={invoiceRefreshKey}
        onOutstandingBalanceChange={setOutstandingBalance}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent
          value="milestones"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>
                Track key dates and deadlines for this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedMilestones.length > 0 ? (
                <ul className="space-y-1">
                  {sortedMilestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="interactive-row flex items-center gap-3 rounded-lg px-2 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => void handleToggleMilestone(milestone)}
                        className="focus-ring rounded-full"
                        aria-label={milestone.done ? "Mark incomplete" : "Mark complete"}
                      >
                        {milestone.done ? (
                          <CheckCircle2 className="size-5 text-status-success-foreground" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            milestone.done && "text-muted-foreground line-through",
                          )}
                        >
                          {milestone.name}
                        </p>
                      </div>
                      {milestone.dueDate ? (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(milestone.dueDate)}
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void handleDeleteMilestone(milestone.id)}
                        aria-label="Delete milestone"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
                  <CalendarDays className="size-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">No milestones yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add milestones to track key dates and deadlines for this project.
                    </p>
                  </div>
                </div>
              )}

              <form
                onSubmit={(event) => void handleAddMilestone(event)}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <Input
                  value={newMilestoneName}
                  onChange={(event) => setNewMilestoneName(event.target.value)}
                  placeholder="Add a milestone…"
                  disabled={addingMilestone}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(event) => setNewMilestoneDate(event.target.value)}
                  disabled={addingMilestone}
                  className="sm:w-44"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={addingMilestone || !newMilestoneName.trim()}
                >
                  {addingMilestone ? <Spinner className="size-4" /> : <Plus />}
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="deliverables"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Deliverables</CardTitle>
                  <CardDescription>
                    Upload videos, manage versions, and run proofing per deliverable.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingDeliverable(null)
                    setDeliverableError(null)
                    setDeliverableDialogOpen(true)
                  }}
                >
                  <Plus />
                  New Deliverable
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {deliverables.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
                  <Film className="size-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">No deliverables yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create a deliverable to start uploading and reviewing videos.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingDeliverable(null)
                      setDeliverableDialogOpen(true)
                    }}
                  >
                    <Plus />
                    New Deliverable
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {deliverables.map((deliverable) => (
                    <Card
                      key={deliverable.id}
                      className="interactive-card relative h-full"
                    >
                      <Link
                        to={`/projects/${project.id}/deliverables/${deliverable.id}`}
                        className="focus-ring block rounded-t-xl"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-snug">
                              {deliverable.name}
                            </CardTitle>
                            <DeliverableStatusBadge status={deliverable.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1">
                              <Film className="size-3.5" />
                              {deliverable.versionCount}
                            </span>
                            {deliverable.openCommentCount > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <MessageSquare className="size-3.5" />
                                {deliverable.openCommentCount}
                              </span>
                            ) : null}
                          </div>
                          {deliverable.dueDate ? (
                            <p>Due {formatDate(deliverable.dueDate)}</p>
                          ) : null}
                        </CardContent>
                      </Link>
                      <CardContent className="flex justify-end gap-1 pt-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit deliverable"
                          onClick={() => {
                            setEditingDeliverable(deliverable)
                            setDeliverableError(null)
                            setDeliverableDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete deliverable"
                          onClick={() => void handleDeleteDeliverable(deliverable.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="services"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <ProjectServicesSection
            projectId={project.id}
            currency={project.budget?.currency}
            projectServices={projectServices}
            onProjectServicesChange={setProjectServices}
            servicesLoading={servicesLoading}
          />
        </TabsContent>
      </Tabs>

      <ProjectFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        project={project}
        submitting={savingProject}
        error={projectError}
        onSubmit={handleSaveProject}
      />

      <DeliverableDialog
        open={deliverableDialogOpen}
        onOpenChange={(open) => {
          setDeliverableDialogOpen(open)
          if (!open) setEditingDeliverable(null)
        }}
        mode={editingDeliverable ? "edit" : "create"}
        deliverable={editingDeliverable}
        submitting={savingDeliverable}
        error={deliverableError}
        onSubmit={handleSaveDeliverable}
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
