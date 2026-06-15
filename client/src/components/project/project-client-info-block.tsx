import { useState } from "react"
import { Building2, Mail, UserPlus, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectClientLinkDialog } from "@/components/project/project-client-link-dialog"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/client"
import type { ProjectDetail } from "@/types/project"

interface ProjectClientInfoBlockProps {
  projectId: string
  client: Client | null
  onViewClient: (clientId: string) => void
  onProjectUpdated: (project: ProjectDetail) => void
  className?: string
}

export function ProjectClientInfoBlock({
  projectId,
  client,
  onViewClient,
  onProjectUpdated,
  className,
}: ProjectClientInfoBlockProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkMode, setLinkMode] = useState<"add" | "change">("add")

  function openLinkDialog(mode: "add" | "change") {
    setLinkMode(mode)
    setLinkDialogOpen(true)
  }

  if (!client) {
    return (
      <>
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3",
            className,
          )}
        >
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">No client linked</p>
            <p className="text-sm text-muted-foreground">
              Link a client to keep contact info in context while you work on
              this project.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => openLinkDialog("add")}
          >
            <UserPlus />
            Add Client
          </Button>
        </div>

        <ProjectClientLinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          projectId={projectId}
          currentClientId={null}
          mode={linkMode}
          onProjectUpdated={onProjectUpdated}
        />
      </>
    )
  }

  const company = client.company?.trim()

  return (
    <>
      <div
        className={cn(
          "rounded-lg border bg-muted/30 px-4 py-3",
          className,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Client
            </p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <UserRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <dd className="font-medium">{client.name}</dd>
              </div>
              {company ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                  <dd>{company}</dd>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <dd>
                  <a
                    href={`mailto:${client.email}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {client.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewClient(client.id)}
            >
              View Client
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openLinkDialog("change")}
            >
              Change Client
            </Button>
          </div>
        </div>
      </div>

      <ProjectClientLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        projectId={projectId}
        currentClientId={client.id}
        mode={linkMode}
        onProjectUpdated={onProjectUpdated}
      />
    </>
  )
}
