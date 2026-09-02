import { Navigate, Outlet, useLocation } from "react-router-dom"
import {
  APP_ROUTES,
  canRoleAccessRoute,
  type AppRouteDefinition,
} from "@playblast/shared"
import { PageLoading } from "@/components/feedback/page-loading"
import { DeploymentErrorPage } from "@/components/feedback/deployment-error-page"
import { useSession } from "@/hooks/use-session"

const PUBLIC_PATHS = new Set([
  "/login",
  "/forbidden",
  "/session-expired",
  "/recover-admin",
])

function isSetupPath(pathname: string): boolean {
  return pathname === "/setup" || pathname.startsWith("/setup/")
}

function isInvitePath(pathname: string): boolean {
  return pathname.startsWith("/invite/")
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || isInvitePath(pathname)
}

function findRouteDefinition(pathname: string): AppRouteDefinition | undefined {
  const exact = APP_ROUTES.find((route) => route.path === pathname)
  if (exact) {
    return exact
  }

  return APP_ROUTES.find((route) => {
    if (!route.path.includes(":")) {
      return false
    }

    const pattern = new RegExp(
      `^${route.path.replace(/:[^/]+/g, "[^/]+")}$`,
    )
    return pattern.test(pathname)
  })
}

export function RouteGuard() {
  const location = useLocation()
  const { state, role, setupComplete } = useSession()
  const pathname = location.pathname

  if (state.status === "loading") {
    return (
      <PageLoading label="Checking studio setup..." className="flex min-h-svh items-center justify-center p-6">
        <div className="text-muted-foreground text-sm">Checking studio setup...</div>
      </PageLoading>
    )
  }

  if (state.status === "unavailable") {
    return (
      <DeploymentErrorPage
        message={state.message}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (!setupComplete) {
    if (pathname === "/setup" && state.setup.status !== "pending") {
      return <Navigate to={state.setup.nextRoute} replace />
    }

    if (isPublicPath(pathname) || isSetupPath(pathname)) {
      return <Outlet />
    }

    return <Navigate to={state.setup.nextRoute} replace />
  }

  if (isSetupPath(pathname)) {
    return <Navigate to="/" replace />
  }

  if (!state.session) {
    if (isPublicPath(pathname)) {
      return <Outlet />
    }

    return <Navigate to="/login" state={{ from: pathname }} replace />
  }

  const route = findRouteDefinition(pathname)
  if (route && role && !canRoleAccessRoute(role, route)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
