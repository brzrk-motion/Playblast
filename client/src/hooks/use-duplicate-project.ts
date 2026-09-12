import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { duplicateProject } from "@/lib/api"
import { toast } from "sonner"
import { humanizeApiError } from "@/lib/toast"

export function useDuplicateProject() {
  const navigate = useNavigate()
  const [duplicating, setDuplicating] = useState(false)

  const duplicate = useCallback(
    async (projectId: string) => {
      setDuplicating(true)
      try {
        const project = await duplicateProject(projectId)
        toast.success("Project duplicated")
        navigate(
          `/projects/${encodeURIComponent(project.id)}?editName=1`,
        )
      } catch (err) {
        toast.error(humanizeApiError(err, "Failed to duplicate project"))
      } finally {
        setDuplicating(false)
      }
    },
    [navigate],
  )

  return { duplicate, duplicating }
}
