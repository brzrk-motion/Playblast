import { Outlet, useLocation } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { PageHeaderProvider } from "@/context/page-header-provider"
import { usePageHeaderContext } from "@/hooks/use-page-header-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getPageHeader } from "@/lib/nav"

function AppLayoutContent() {
  const location = useLocation()
  const { projectName } = usePageHeaderContext()
  const { title, subtitle } = getPageHeader(location.pathname)
  const isReviewLayout = /^\/projects\/[^/]+\/deliverables\/[^/]+$/.test(
    location.pathname,
  )
  const isProjectScoped = /^\/projects\/[^/]+/.test(location.pathname)
  const headerSubtitle = isProjectScoped ? projectName : subtitle

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <AppHeader title={title} subtitle={headerSubtitle} />
        {isReviewLayout ? (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
            <Outlet />
          </main>
        ) : (
          <ScrollArea className="flex-1">
            <main className="p-4 md:p-6">
              <Outlet />
            </main>
          </ScrollArea>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

export function AppLayout() {
  return (
    <PageHeaderProvider>
      <AppLayoutContent />
    </PageHeaderProvider>
  )
}
