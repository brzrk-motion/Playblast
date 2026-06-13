import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { ProjectStatusBadge } from "@/components/project/project-status-badge"
import { listProjects, updateProject } from "@/lib/api"
import { filterProjectsByName } from "@/lib/projects"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { ProjectSummary } from "@/types/project"

interface LinkProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onLinked: () => void
}

export function LinkProjectModal({
  open,
  onOpenChange,
  clientId,
  onLinked,
}: LinkProjectModalProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [linkingProjectId, setLinkingProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadProjects() {
      setLoading(true)
      try {
        const data = await listProjects()
        if (!cancelled) {
          setProjects(data.filter((project) => !project.clientId))
        }
      } catch (err) {
        if (!cancelled) {
          showErrorToast(humanizeApiError(err, "Failed to load projects"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProjects()

    return () => {
      cancelled = true
    }
  }, [open])

  const filteredProjects = useMemo(
    () => filterProjectsByName(projects, searchQuery),
    [projects, searchQuery],
  )

  async function handleLink(projectId: string) {
    setLinkingProjectId(projectId)
    try {
      await updateProject(projectId, { clientId })
      showSuccessToast("Project linked")
      onOpenChange(false)
      setSearchQuery("")
      onLinked()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to link project"))
    } finally {
      setLinkingProjectId(null)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSearchQuery("")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link a Project</DialogTitle>
          <DialogDescription>
            Choose an unlinked project to associate with this client.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects…"
            className="pl-9"
            aria-label="Search unlinked projects"
          />
        </div>

        <ScrollArea className="max-h-80 rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading projects…
            </div>
          ) : filteredProjects.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {projects.length === 0
                ? "All projects are already linked to a client."
                : "No matching unlinked projects."}
            </p>
          ) : (
            <div className="divide-y">
              {filteredProjects.map((project) => {
                const isLinking = linkingProjectId === project.id
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">{project.name}</p>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={linkingProjectId !== null}
                      onClick={() => void handleLink(project.id)}
                    >
                      {isLinking ? <Spinner className="size-4" /> : "Link"}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
