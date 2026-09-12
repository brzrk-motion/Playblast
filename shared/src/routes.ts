import type { UserRole } from "./roles.js"
import { hasCapability, type Capability } from "./capabilities.js"

/** Route access classification for the MVP application shell. */
export const ROUTE_ACCESS_LEVELS = [
  "public",
  "setup",
  "authenticated",
  "admin",
  "creative",
  "proofing",
] as const

export type RouteAccessLevel = (typeof ROUTE_ACCESS_LEVELS)[number]

export interface AppRouteDefinition {
  path: string
  name: string
  access: RouteAccessLevel
  requiredCapabilities: Capability[]
  implemented: boolean
  notes?: string
}

/** Canonical client route map and access classification for the MVP shell. */
export const APP_ROUTES: AppRouteDefinition[] = [
  { path: "/health", name: "Health check", access: "public", requiredCapabilities: [], implemented: true, notes: "Server-only; not a client route." },
  { path: "/login", name: "Login", access: "public", requiredCapabilities: [], implemented: true },
  { path: "/setup", name: "First-run admin", access: "setup", requiredCapabilities: ["setup.complete"], implemented: true },
  { path: "/setup/studio", name: "Studio profile", access: "setup", requiredCapabilities: ["setup.complete", "studio.manage"], implemented: true },
  { path: "/setup/complete", name: "Setup completion", access: "setup", requiredCapabilities: ["setup.complete"], implemented: true },
  { path: "/invite/:token", name: "Invite acceptance", access: "public", requiredCapabilities: [], implemented: true },
  { path: "/", name: "Dashboard", access: "authenticated", requiredCapabilities: ["projects.view"], implemented: true },
  { path: "/projects", name: "Projects", access: "authenticated", requiredCapabilities: ["projects.view"], implemented: true },
  { path: "/projects/:projectId", name: "Project overview", access: "authenticated", requiredCapabilities: ["projects.view"], implemented: true },
  { path: "/projects/:projectId/deliverables/:deliverableId", name: "Deliverable review", access: "authenticated", requiredCapabilities: ["review.play"], implemented: true },
  { path: "/projects/:projectId/deliverables/:deliverableId/compare", name: "Version compare", access: "authenticated", requiredCapabilities: ["review.compare"], implemented: true },
  { path: "/team", name: "Team", access: "authenticated", requiredCapabilities: ["team.view"], implemented: true },
  { path: "/settings", name: "Settings", access: "authenticated", requiredCapabilities: ["studio.view"], implemented: true, notes: "Browser-local prefs; studio SMTP is on Team (Admin-only)." },
  { path: "/profile", name: "Profile", access: "authenticated", requiredCapabilities: ["studio.view"], implemented: true },
  { path: "/clients", name: "Clients", access: "authenticated", requiredCapabilities: ["business.manage"], implemented: true, notes: "CRM surface for Admin and Account Executive." },
  { path: "/pipeline", name: "Pipeline", access: "authenticated", requiredCapabilities: ["business.manage"], implemented: true, notes: "CRM surface for Admin and Account Executive." },
  { path: "/services", name: "Services", access: "authenticated", requiredCapabilities: ["business.manage"], implemented: true, notes: "Operations surface for Admin and Account Executive." },
  { path: "/timesheet", name: "Timesheet", access: "authenticated", requiredCapabilities: ["business.manage"], implemented: true, notes: "Operations surface for Admin and Account Executive." },
  { path: "/capacity", name: "Capacity", access: "authenticated", requiredCapabilities: ["business.manage"], implemented: true, notes: "Operations surface for Admin and Account Executive." },
  { path: "/forbidden", name: "Forbidden", access: "public", requiredCapabilities: [], implemented: true },
  { path: "/session-expired", name: "Session expired", access: "public", requiredCapabilities: [], implemented: true },
]

export function getClientRoutes(): AppRouteDefinition[] {
  return APP_ROUTES.filter((route) => route.path !== "/health")
}

export function canRoleAccessRoute(role: UserRole, route: AppRouteDefinition): boolean {
  switch (route.access) {
    case "public":
    case "setup":
      return true
    case "authenticated":
      return route.requiredCapabilities.every((capability) => hasCapability(role, capability))
    case "admin":
      return role === "admin" && route.requiredCapabilities.every((capability) => hasCapability(role, capability))
    case "creative":
      return (role === "admin" || role === "creative") && route.requiredCapabilities.every((capability) => hasCapability(role, capability))
    case "proofing":
      return (role === "admin" || role === "creative" || role === "proofing") && route.requiredCapabilities.every((capability) => hasCapability(role, capability))
    default:
      return false
  }
}
