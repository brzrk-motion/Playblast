import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={title} subtitle={subtitle} />
        <ScrollArea className="flex-1">
          <main className="p-4 md:p-6">{children}</main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
