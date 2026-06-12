import { useMemo, useState, type ReactNode } from "react"
import { PageHeaderContext } from "@/context/page-header-context"

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [projectName, setProjectName] = useState<string | undefined>()

  const value = useMemo(
    () => ({ projectName, setProjectName }),
    [projectName],
  )

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  )
}
