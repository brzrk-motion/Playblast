import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { duplicateProject } from "@/lib/api"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"

export function useDuplicateProject() {
  const navigate = useNavigate()
  const [duplicating, setDuplicating] = useState(false)

  const duplicate = useCallback(
    async (projectId: string) => {
      setDuplicating(true)
      try {
        const project = await duplicateProject(projectId)
        showSuccessToast("Project duplicated")
        navigate(
          `/projects/${encodeURIComponent(project.id)}?editName=1`,
        )
      } catch (err) {
        showErrorToast(humanizeApiError(err, "Failed to duplicate project"))
      } finally {
        setDuplicating(false)
      }
    },
    [navigate],
  )

  return { duplicate, duplicating }
}
