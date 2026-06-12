import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { ComparePage } from "@/pages/compare"
import { ComingSoonPage } from "@/pages/coming-soon"
import { DashboardPage } from "@/pages/dashboard"
import { DeliverablePage } from "@/pages/deliverable"
import { ProjectOverviewPage } from "@/pages/project-overview"
import { ProjectsPage } from "@/pages/projects"
import { SettingsPage } from "@/pages/settings"
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
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectOverviewPage />} />
              <Route
                path="projects/:projectId/deliverables/:deliverableId"
                element={<DeliverablePage />}
              />
              <Route
                path="projects/:projectId/deliverables/:deliverableId/compare"
                element={<ComparePage />}
              />
              <Route path="settings" element={<SettingsPage />} />
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
