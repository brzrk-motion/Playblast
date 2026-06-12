import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { ComparePage } from "@/pages/compare"
import { ComingSoonPage } from "@/pages/coming-soon"
import { DashboardPage } from "@/pages/dashboard"
import { ProjectPage } from "@/pages/project"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster position="bottom-right" duration={3000} closeButton />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="reviews" element={<ComingSoonPage />} />
              <Route path="reviews/pending" element={<ComingSoonPage />} />
              <Route path="reviews/approved" element={<ComingSoonPage />} />
              <Route path="comparisons/ab-compare" element={<ComingSoonPage />} />
              <Route path="comparisons/version-history" element={<ComingSoonPage />} />
              <Route path="projects" element={<ComingSoonPage />} />
              <Route path="projects/:projectId" element={<ProjectPage />} />
              <Route path="projects/:projectId/compare" element={<ComparePage />} />
              <Route path="team" element={<ComingSoonPage />} />
              <Route path="settings" element={<ComingSoonPage />} />
              <Route path="profile" element={<ComingSoonPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
