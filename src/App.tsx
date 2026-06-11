import { ThemeProvider } from "@/components/layout/theme-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { DashboardPage } from "@/pages/dashboard"
import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <AppLayout title="Dashboard">
          <DashboardPage />
        </AppLayout>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
