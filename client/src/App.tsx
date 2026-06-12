import { ThemeProvider } from "@/components/layout/theme-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { ReviewPage } from "@/pages/review"
import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <AppLayout title="Review">
          <ReviewPage />
        </AppLayout>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
