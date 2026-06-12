import { useContext } from "react"
import { PageHeaderContext } from "@/context/page-header-context"

export function usePageHeaderContext() {
  const context = useContext(PageHeaderContext)
  if (!context) {
    throw new Error(
      "usePageHeaderContext must be used within PageHeaderProvider",
    )
  }
  return context
}
