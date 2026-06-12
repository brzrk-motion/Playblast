import { createContext } from "react"

export interface PageHeaderContextValue {
  projectName: string | undefined
  setProjectName: (name: string | undefined) => void
}

export const PageHeaderContext = createContext<PageHeaderContextValue | null>(
  null,
)
