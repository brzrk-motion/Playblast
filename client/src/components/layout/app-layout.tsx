import { Outlet, useLocation, useParams } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { ScrollArea } from "@/components/ui/scroll-area"

function usePageHeader() {
  const location = useLocation()
  const { projectId } = useParams()

  if (location.pathname.startsWith("/projects/")) {
    return {
      title: "Project",
      subtitle: projectId,
    }
  }

  return {
    title: "Dashboard",
    subtitle: undefined,
  }
}

export function AppLayout() {
  const { title, subtitle } = usePageHeader()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={title} subtitle={subtitle} />
        <ScrollArea className="flex-1">
          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
