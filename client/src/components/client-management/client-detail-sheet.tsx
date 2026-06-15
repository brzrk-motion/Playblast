import { useEffect, useMemo, useState } from "react"
import {
  ExternalLink,
  FolderKanban,
  Link2,
  Link2Off,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { ProjectStatusBadge } from "@/components/project/project-status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { deleteClient, getClient, updateProject } from "@/lib/api"
import { formatDateAdded } from "@/lib/dates"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { Client, ClientWithProjects } from "@/types/client"
import type { Project } from "@/types/project"

interface ClientDetailSheetProps {
  clientId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientDeleted?: () => void
  onEdit?: (client: Client) => void
  onRevert?: (client: Client) => void
  onLinkProject?: (clientId: string) => void
  onProjectsChanged?: () => void
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function formatProjectDate(value?: string): string {
  if (!value) {
    return "—"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatWebsiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function LinkedProjectCard({
  project,
  onUnlink,
  unlinking,
}: {
  project: Project
  onUnlink: (project: Project) => void
  unlinking: boolean
}) {
  return (
    <Card className="h-full border-muted">
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/projects/${encodeURIComponent(project.id)}`}
            className="rounded-sm focus-ring"
          >
            <CardTitle className="text-base leading-snug hover:underline">
              {project.name}
            </CardTitle>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <ProjectStatusBadge status={project.status} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Unlink ${project.name}`}
              title="Unlink project"
              disabled={unlinking}
              onClick={() => onUnlink(project)}
            >
              {unlinking ? (
                <Spinner className="size-4" />
              ) : (
                <Link2Off className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>
          {formatProjectDate(project.startDate)} – {formatProjectDate(project.endDate)}
        </p>
      </CardContent>
    </Card>
  )
}

export function ClientDetailSheet({
  clientId,
  open,
  onOpenChange,
  onClientDeleted,
  onEdit,
  onRevert,
  onLinkProject,
  onProjectsChanged,
}: ClientDetailSheetProps) {
  const [client, setClient] = useState<ClientWithProjects | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [unlinkingProjectId, setUnlinkingProjectId] = useState<string | null>(
    null,
  )
  const [unlinkingAll, setUnlinkingAll] = useState(false)

  const hasActiveProjects = useMemo(
    () => client?.projects.some((project) => project.status !== "archived") ?? false,
    [client?.projects],
  )

  async function refreshClient() {
    if (!clientId) {
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getClient(clientId)
      setClient(data)
      return data
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load client")
      setError(message)
      showErrorToast(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  function resetState() {
    setClient(null)
    setError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetState()
    }
    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (!open || !clientId) {
      return
    }

    let cancelled = false

    async function load() {
      const currentClientId = clientId
      if (!currentClientId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await getClient(currentClientId)
        if (!cancelled) {
          setClient(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load client")
          setError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [clientId, open])

  async function handleDelete() {
    if (!client) {
      return
    }

    if (hasActiveProjects) {
      showErrorToast(
        "Client cannot be deleted while linked to active projects. Archive or unlink those projects first.",
      )
      return
    }

    if (
      !window.confirm(`Delete client "${client.name}"? This cannot be undone.`)
    ) {
      return
    }

    setDeleting(true)

    try {
      await deleteClient(client.id)
      showSuccessToast("Client deleted")
      onOpenChange(false)
      onClientDeleted?.()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete client"))
    } finally {
      setDeleting(false)
    }
  }

  async function handleUnlink(project: Project) {
    if (!client) {
      return
    }

    if (
      !window.confirm(
        `Unlink "${project.name}" from ${client.name}? The project itself will not be deleted.`,
      )
    ) {
      return
    }

    setUnlinkingProjectId(project.id)

    try {
      await updateProject(project.id, { clientId: null })
      showSuccessToast(`Unlinked ${project.name}`)
      await refreshClient()
      onProjectsChanged?.()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to unlink project"))
    } finally {
      setUnlinkingProjectId(null)
    }
  }

  async function handleUnlinkAll() {
    if (!client || client.projects.length === 0) {
      return
    }

    if (
      !window.confirm(
        `Unlink all ${client.projects.length} projects from ${client.name}? The projects themselves will not be deleted.`,
      )
    ) {
      return
    }

    setUnlinkingAll(true)

    try {
      await Promise.all(
        client.projects.map((project) =>
          updateProject(project.id, { clientId: null }),
        ),
      )
      showSuccessToast("Unlinked all projects")
      await refreshClient()
      onProjectsChanged?.()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to unlink projects"))
    } finally {
      setUnlinkingAll(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-xl"
      >
        {loading && !client ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error && !client ? (
          <div className="flex flex-col gap-3 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void refreshClient()}>
              Retry
            </Button>
          </div>
        ) : client ? (
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b px-6 pt-6 pb-4">
              <div className="flex flex-col gap-3 pr-8">
                <div className="space-y-1">
                  <SheetTitle className="text-2xl">{client.name}</SheetTitle>
                  <SheetDescription className="text-base">
                    {client.company ?? "No company"}
                  </SheetDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(client)}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={hasActiveProjects}
                    title={
                      hasActiveProjects
                        ? "Cannot convert to a lead while linked to active projects"
                        : undefined
                    }
                    onClick={() => onRevert?.(client)}
                  >
                    <Undo2 className="size-4" />
                    Convert to Lead
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting || hasActiveProjects}
                    title={
                      hasActiveProjects
                        ? "Cannot delete while linked to active projects"
                        : undefined
                    }
                    onClick={() => void handleDelete()}
                  >
                    {deleting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 px-6 py-5">
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Contact Information</h3>
                <dl className="space-y-3">
                  <DetailRow label="Email">
                    <a
                      href={`mailto:${client.email}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {client.email}
                    </a>
                  </DetailRow>
                  <DetailRow label="Phone">
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </DetailRow>
                  <DetailRow label="Website">
                    {client.website ? (
                      <a
                        href={formatWebsiteHref(client.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                      >
                        {client.website}
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </DetailRow>
                  <DetailRow label="Notes">{client.notes ?? "—"}</DetailRow>
                  <DetailRow label="Date added">
                    {formatDateAdded(client.createdAt)}
                  </DetailRow>
                  {client.convertedFromLeadId ? (
                    <DetailRow label="Converted from lead">
                      <Link
                        to={`/clients?lead=${encodeURIComponent(client.convertedFromLeadId)}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        View Original Lead
                      </Link>
                    </DetailRow>
                  ) : null}
                </dl>
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Linked Projects</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {client.projects.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={unlinkingAll}
                        onClick={() => void handleUnlinkAll()}
                      >
                        {unlinkingAll ? (
                          <Spinner className="size-4" />
                        ) : (
                          <Link2Off className="size-4" />
                        )}
                        Unlink All
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => client && onLinkProject?.(client.id)}
                    >
                      <Link2 className="size-4" />
                      Link a Project
                    </Button>
                  </div>
                </div>

                {client.projects.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
                    <FolderKanban className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No projects linked yet
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {client.projects.map((project) => (
                      <LinkedProjectCard
                        key={project.id}
                        project={project}
                        onUnlink={(target) => void handleUnlink(target)}
                        unlinking={unlinkingProjectId === project.id}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
