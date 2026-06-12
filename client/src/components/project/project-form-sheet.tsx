import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectFormValues } from "@/lib/project-form"
import { PROJECT_STATUS_LABELS } from "@/lib/projects"
import { PROJECT_STATUSES } from "@/types/project"
import type { Project, ProjectStatus } from "@/types/project"

export interface ProjectFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  project?: Project | null
  submitting?: boolean
  error?: string | null
  onSubmit: (values: ProjectFormValues) => void
}

function toDateInput(value?: string): string {
  if (!value) return ""
  return value.slice(0, 10)
}

function initialValues(project?: Project | null): ProjectFormValues {
  return {
    name: project?.name ?? "",
    client: project?.client ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "active",
    startDate: toDateInput(project?.startDate),
    endDate: toDateInput(project?.endDate),
    budgetTotal:
      project?.budget?.total !== undefined ? String(project.budget.total) : "",
    budgetSpent:
      project?.budget?.spent !== undefined ? String(project.budget.spent) : "",
    currency: project?.budget?.currency ?? "USD",
  }
}

export function ProjectFormSheet({
  open,
  onOpenChange,
  mode,
  project,
  submitting = false,
  error,
  onSubmit,
}: ProjectFormSheetProps) {
  const [values, setValues] = useState<ProjectFormValues>(() =>
    initialValues(project),
  )
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(project))
    }
  }

  function update<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
          className="flex h-full flex-col"
        >
          <SheetHeader>
            <SheetTitle>
              {mode === "create" ? "New Project" : "Edit Project"}
            </SheetTitle>
            <SheetDescription>
              {mode === "create"
                ? "Set up a project with its client, timeline, and budget."
                : "Update the project details, timeline, and budget."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="e.g. Hero Spot Q3"
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-client">Client</Label>
              <Input
                id="project-client"
                value={values.client}
                onChange={(event) => update("client", event.target.value)}
                placeholder="e.g. BRZRK"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  update("status", value as ProjectStatus)
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {PROJECT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="project-start">Start date</Label>
                <Input
                  id="project-start"
                  type="date"
                  value={values.startDate}
                  onChange={(event) => update("startDate", event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-end">End date</Label>
                <Input
                  id="project-end"
                  type="date"
                  value={values.endDate}
                  onChange={(event) => update("endDate", event.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="project-budget">Budget</Label>
                <Input
                  id="project-budget"
                  type="number"
                  min="0"
                  value={values.budgetTotal}
                  onChange={(event) => update("budgetTotal", event.target.value)}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-currency">Currency</Label>
                <Input
                  id="project-currency"
                  value={values.currency}
                  onChange={(event) => update("currency", event.target.value)}
                  placeholder="USD"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-spent">Spent to date</Label>
              <Input
                id="project-spent"
                type="number"
                min="0"
                value={values.budgetSpent}
                onChange={(event) => update("budgetSpent", event.target.value)}
                placeholder="0"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={values.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Scope, goals, and notes for this project."
                rows={3}
                disabled={submitting}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="size-4" />
                  {mode === "create" ? "Creating…" : "Saving…"}
                </>
              ) : mode === "create" ? (
                "Create Project"
              ) : (
                "Save Changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
