import { useEffect } from "react"
import { usePageHeaderContext } from "@/hooks/use-page-header-context"
import type { Project } from "@/types/project"

export function useProjectPageHeader(
  projectId: string,
  project: Project | null,
) {
  const { setProjectName } = usePageHeaderContext()

  useEffect(() => {
    if (project && project.id === projectId) {
      setProjectName(project.name)
    } else {
      setProjectName(undefined)
    }

    return () => setProjectName(undefined)
  }, [projectId, project, setProjectName])
}
