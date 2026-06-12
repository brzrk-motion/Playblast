import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/layout/theme-toggle"

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
        <ThemeToggle />
      </div>
    </header>
  )
}
