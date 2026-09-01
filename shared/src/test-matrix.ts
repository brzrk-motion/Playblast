import type { Capability } from "./capabilities.js"
import { CAPABILITIES, hasCapability } from "./capabilities.js"
import type { UserRole } from "./roles.js"
import { USER_ROLES } from "./roles.js"
import { getClientRoutes, canRoleAccessRoute } from "./routes.js"
import { getNavVisibility } from "./navigation.js"

export type TestExpectation = "allow" | "deny"

export interface CapabilityTestCase {
  capability: Capability
  role: UserRole
  expected: TestExpectation
}

export interface RouteTestCase {
  path: string
  role: UserRole
  expected: TestExpectation
}

export interface NavTestCase {
  itemId: string
  role: UserRole
  expectedVisibility: "visible" | "hidden" | "disabled"
}

export function buildCapabilityTestMatrix(): CapabilityTestCase[] {
  return USER_ROLES.flatMap((role) =>
    CAPABILITIES.map((capability) => ({
      capability,
      role,
      expected: hasCapability(role, capability) ? "allow" : "deny",
    })),
  )
}

export function buildRouteTestMatrix(): RouteTestCase[] {
  const routes = getClientRoutes().filter((route) => route.implemented)
  return USER_ROLES.flatMap((role) =>
    routes.map((route) => ({
      path: route.path,
      role,
      expected: canRoleAccessRoute(role, route) ? "allow" : "deny",
    })),
  )
}

export const DEFERRED_FEATURE_SURFACES = [
  "Hosted SaaS tenancy",
  "Guest/client external accounts",
  "Billing and subscriptions",
  "Paid support commitments",
  "SSO/SCIM",
  "Native mobile apps",
  "Self-hosted mail server operations",
] as const

export const MVP_CRM_ROUTES_ADMIN_ONLY = [
  "/clients",
  "/pipeline",
  "/services",
  "/timesheet",
  "/capacity",
] as const

export function buildNavTestMatrix(): NavTestCase[] {
  const itemIds = [
    "dashboard",
    "projects",
    "pipeline",
    "clients",
    "services",
    "timesheet",
    "capacity",
    "team",
    "settings",
    "profile",
  ] as const

  return USER_ROLES.flatMap((role) =>
    itemIds.map((itemId) => ({
      itemId,
      role,
      expectedVisibility: getNavVisibility(role, itemId),
    })),
  )
}
