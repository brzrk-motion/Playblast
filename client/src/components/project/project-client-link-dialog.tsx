import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { ClientSelector } from "@/components/project/client-selector"
import { getProject, updateProject } from "@/lib/api"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { ProjectDetail } from "@/types/project"

interface ProjectClientLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  currentClientId: string | null
  mode: "add" | "change"
  onProjectUpdated: (project: ProjectDetail) => void
}

function ProjectClientLinkDialogBody({
  projectId,
  currentClientId,
  mode,
  onOpenChange,
  onProjectUpdated,
}: Omit<ProjectClientLinkDialogProps, "open">) {
  const [clientId, setClientId] = useState(currentClientId)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (clientId === currentClientId) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    try {
      await updateProject(projectId, { clientId })
      const refreshed = await getProject(projectId)
      onProjectUpdated(refreshed)
      showSuccessToast(
        clientId
          ? mode === "add"
            ? "Client linked"
            : "Client updated"
          : "Client unlinked",
      )
      onOpenChange(false)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to update client link"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "add" ? "Add Client" : "Change Client"}
        </DialogTitle>
        <DialogDescription>
          {mode === "add"
            ? "Link a client to this project for quick contact and context."
            : "Choose a different client for this project, or unlink the current one."}
        </DialogDescription>
      </DialogHeader>

      <ClientSelector
        value={clientId}
        onChange={setClientId}
        disabled={saving}
        loadOnMount
        id="project-client-link"
      />

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </DialogFooter>
    </>
  )
}

export function ProjectClientLinkDialog({
  open,
  onOpenChange,
  projectId,
  currentClientId,
  mode,
  onProjectUpdated,
}: ProjectClientLinkDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <ProjectClientLinkDialogBody
            key={currentClientId ?? "none"}
            projectId={projectId}
            currentClientId={currentClientId}
            mode={mode}
            onOpenChange={onOpenChange}
            onProjectUpdated={onProjectUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
