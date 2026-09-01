import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { RouteGuard } from "@/components/routing/route-guard"
import { SessionProvider } from "@/context/session-provider"
import { ForbiddenPage } from "@/pages/auth/forbidden"
import { InviteAcceptPage } from "@/pages/auth/invite-accept"
import { LoginShellPage } from "@/pages/auth/login-shell"
import { RecoverAdminPage } from "@/pages/auth/recover-admin"
import { SessionExpiredPage } from "@/pages/auth/session-expired"
import { SetupCompletePage } from "@/pages/auth/setup-complete"
import { SetupShellPage } from "@/pages/auth/setup-shell"
import { SetupStudioPage } from "@/pages/auth/setup-studio"
import { CapacityPage } from "@/pages/capacity"
import { ComparePage } from "@/pages/compare"
import { ProfilePage } from "@/pages/profile"
import { ClientsPage } from "@/pages/clients"
import { DashboardPage } from "@/pages/dashboard"
import { DeliverablePage } from "@/pages/deliverable"
import { ProjectOverviewPage } from "@/pages/project-overview"
import { ProjectsPage } from "@/pages/projects"
import { ServicesPage } from "@/pages/services"
import { SettingsPage } from "@/pages/settings"
import { TeamPage } from "@/pages/team"
import { TimesheetPage } from "@/pages/timesheet"
import { PipelinePage } from "@/pages/pipeline"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster position="bottom-right" duration={3000} closeButton />
        <BrowserRouter>
          <SessionProvider>
            <Routes>
              <Route element={<RouteGuard />}>
                <Route path="/login" element={<LoginShellPage />} />
                <Route path="/recover-admin" element={<RecoverAdminPage />} />
                <Route path="/setup" element={<SetupShellPage />} />
                <Route path="/setup/studio" element={<SetupStudioPage />} />
                <Route path="/setup/complete" element={<SetupCompletePage />} />
                <Route path="/invite/:token" element={<InviteAcceptPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />
                <Route path="/session-expired" element={<SessionExpiredPage />} />
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="timesheet" element={<TimesheetPage />} />
                  <Route path="pipeline" element={<PipelinePage />} />
                  <Route path="capacity" element={<CapacityPage />} />
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
                  <Route path="team" element={<TeamPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </SessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
