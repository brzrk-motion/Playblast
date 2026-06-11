import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppHeaderProps {
  title?: string
  subtitle?: string
}

export function AppHeader({ title = "Dashboard", subtitle }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex flex-1 items-center gap-2">
        <h1 className="text-sm font-semibold">{title}</h1>
        {subtitle && (
          <span className="text-xs text-muted-foreground hidden sm:block">/ {subtitle}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          <Badge className="absolute -right-0.5 -top-0.5 size-2 p-0 border-background border-2" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
