import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { ChunkErrorBoundary } from "@/components/routing/chunk-error-boundary"
import { RouteGuard } from "@/components/routing/route-guard"
import { SessionProvider } from "@/context/session-provider"
import { PageLoading } from "@/components/feedback/page-loading"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const LoginShellPage = lazy(() => import("@/pages/auth/login-shell"))
const RecoverAdminPage = lazy(() => import("@/pages/auth/recover-admin"))
const SetupShellPage = lazy(() => import("@/pages/auth/setup-shell"))
const SetupStudioPage = lazy(() => import("@/pages/auth/setup-studio"))
const SetupCompletePage = lazy(() => import("@/pages/auth/setup-complete"))
const InviteAcceptPage = lazy(() => import("@/pages/auth/invite-accept"))
const ForbiddenPage = lazy(() => import("@/pages/auth/forbidden"))
const SessionExpiredPage = lazy(() => import("@/pages/auth/session-expired"))
const CapacityPage = lazy(() => import("@/pages/capacity"))
const ComparePage = lazy(() => import("@/pages/compare"))
const ProfilePage = lazy(() => import("@/pages/profile"))
const ClientsPage = lazy(() => import("@/pages/clients"))
const DashboardPage = lazy(() => import("@/pages/dashboard"))
const DeliverablePage = lazy(() => import("@/pages/deliverable"))
const ProjectOverviewPage = lazy(() => import("@/pages/project-overview"))
const ProjectsPage = lazy(() => import("@/pages/projects"))
const ServicesPage = lazy(() => import("@/pages/services"))
const SettingsPage = lazy(() => import("@/pages/settings"))
const TeamPage = lazy(() => import("@/pages/team"))
const TimesheetPage = lazy(() => import("@/pages/timesheet"))
const PipelinePage = lazy(() => import("@/pages/pipeline"))

function RouteFallback() {
  return (
    <PageLoading
      label="Loading page…"
      className="flex min-h-svh items-center justify-center p-6"
    >
      <div className="text-muted-foreground text-sm">Loading page…</div>
    </PageLoading>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster position="bottom-right" duration={3000} closeButton />
        <BrowserRouter>
          <SessionProvider>
            <ChunkErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
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
              </Suspense>
            </ChunkErrorBoundary>
          </SessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
