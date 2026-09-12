import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  APP_ROUTES,
  assertAdminSuperset,
  buildCapabilityTestMatrix,
  buildNavTestMatrix,
  buildRouteTestMatrix,
  canRoleAccessRoute,
  CAPABILITIES,
  createApiError,
  getClientRoutes,
  getHttpStatusForErrorCode,
  getNavVisibility,
  getUiStateForErrorCode,
  getVisibleNavItems,
  hasCapability,
  MVP_BUSINESS_ROUTES,
  ROLE_BADGE_TOKENS,
  ROLE_CAPABILITY_MATRIX,
  UI_STATE_CATALOG,
  UI_STATES,
  USER_ROLES,
  type UserRole,
} from "./index.js"

const DEFERRED_FEATURE_SURFACES = [
  "Hosted SaaS tenancy",
  "Guest/client external accounts",
  "Billing and subscriptions",
  "Paid support commitments",
  "SSO/SCIM",
  "Native mobile apps",
  "Self-hosted mail server operations",
] as const

const SETUP_PROGRESS_STEPS = [
  { id: "admin", label: "Admin account" },
  { id: "studio", label: "Studio profile" },
  { id: "smtp", label: "Email (optional)" },
  { id: "team", label: "Invite team" },
] as const

const DESTRUCTIVE_ACTION_TOKENS = {
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  buttonVariant: "destructive",
  requiresAdminCapability: "data.delete",
} as const

const RESPONSIVE_BREAKPOINTS = {
  tabletMin: "768px",
  desktopMin: "1024px",
  reviewMinWidth: "1024px",
  setupMaxWidth: "480px",
  loginMaxWidth: "400px",
  teamTableMinWidth: "768px",
} as const

const IMPLEMENTED_ROUTES = getClientRoutes().filter((route) => route.implemented)
const ROLES: UserRole[] = ["admin", "account_executive", "creative", "proofing"]

describe("role capability contract", () => {
  it("defines every capability for every role", () => {
    for (const capability of Object.keys(ROLE_CAPABILITY_MATRIX)) {
      const grants = ROLE_CAPABILITY_MATRIX[capability as keyof typeof ROLE_CAPABILITY_MATRIX]
      for (const role of USER_ROLES) {
        assert.equal(typeof grants[role], "string")
      }
    }
  })

  it("keeps admin as the superset role", () => {
    assert.doesNotThrow(() => assertAdminSuperset())
    assert.equal(buildCapabilityTestMatrix().length, CAPABILITIES.length * USER_ROLES.length)
  })

  it("denies proofing structural mutations", () => {
    assert.equal(hasCapability("proofing", "media.upload"), false)
    assert.equal(hasCapability("proofing", "data.delete"), false)
    assert.equal(hasCapability("proofing", "comments.create"), true)
    assert.equal(hasCapability("proofing", "projects.mutate"), false)
    assert.equal(hasCapability("proofing", "approval.mutate"), false)
    assert.equal(hasCapability("creative", "approval.mutate"), true)
  })

  it("maps canonical API error codes to HTTP statuses", () => {
    assert.equal(getHttpStatusForErrorCode("FORBIDDEN"), 403)
    assert.equal(getHttpStatusForErrorCode("SESSION_EXPIRED"), 401)
    assert.equal(getHttpStatusForErrorCode("INVITE_EXPIRED"), 410)
    assert.equal(getHttpStatusForErrorCode("DELIVERY_FAILED"), 502)

    const envelope = createApiError("VALIDATION_FAILED", undefined, { email: ["Invalid email"] })
    assert.equal(envelope.code, "VALIDATION_FAILED")
    assert.deepEqual(envelope.details, { email: ["Invalid email"] })
  })
})

describe("route and navigation crosswalk", () => {
  it("maps business routes to business capability access", () => {
    for (const path of MVP_BUSINESS_ROUTES) {
      const route = APP_ROUTES.find((entry) => entry.path === path)
      assert.ok(route, `missing route ${path}`)
      assert.equal(route.access, "authenticated")
      assert.equal(canRoleAccessRoute("creative", route), false)
      assert.equal(canRoleAccessRoute("account_executive", route), true)
      assert.equal(canRoleAccessRoute("admin", route), true)

      const navId = path.slice(1)
      assert.equal(getNavVisibility("creative", navId), "hidden")
      assert.equal(getNavVisibility("admin", navId), "visible")
    }
  })

  it("classifies proofing routes as authenticated", () => {
    const reviewRoute = APP_ROUTES.find(
      (route) => route.path === "/projects/:projectId/deliverables/:deliverableId",
    )
    assert.ok(reviewRoute)
    assert.equal(reviewRoute.access, "authenticated")
    assert.equal(canRoleAccessRoute("proofing", reviewRoute), true)
  })

  it("returns only visible nav items for each role", () => {
    const adminMain = getVisibleNavItems("admin", "main")
    const proofingMain = getVisibleNavItems("proofing", "main")

    assert.ok(adminMain.some((item) => item.id === "clients"))
    assert.equal(proofingMain.some((item) => item.id === "clients"), false)
    assert.equal(getNavVisibility("proofing", "projects"), "visible")
  })
})

describe("test matrices", () => {
  it("builds deterministic capability cases", () => {
    const matrix = buildCapabilityTestMatrix()
    assert.equal(matrix.length, CAPABILITIES.length * USER_ROLES.length)
    assert.ok(matrix.every((entry) => entry.expected === "allow" || entry.expected === "deny"))
  })

  it("builds route and nav matrices", () => {
    assert.ok(buildRouteTestMatrix().length > 0)
    assert.ok(buildNavTestMatrix().length > 0)
    assert.equal(buildRouteTestMatrix().length, IMPLEMENTED_ROUTES.length * ROLES.length)
  })
})

describe("ui state mapping", () => {
  it("maps session expiry to the session_expired state", () => {
    assert.equal(getUiStateForErrorCode("SESSION_EXPIRED"), "session_expired")
    assert.equal(getUiStateForErrorCode("DELIVERY_FAILED"), "delivery_failure")
    assert.equal(getUiStateForErrorCode("FORBIDDEN"), "forbidden")
    assert.equal(getUiStateForErrorCode("INVITE_REVOKED"), "invite_expired")
  })

  it("catalogs required shared states", () => {
    for (const state of [
      "loading",
      "empty",
      "unauthorized",
      "forbidden",
      "session_expired",
      "invite_expired",
      "validation_error",
      "delivery_failure",
      "offline",
      "server_unavailable",
    ] as const) {
      assert.ok(UI_STATE_CATALOG[state])
    }
  })

  it("defines role badge tokens for all roles", () => {
    assert.equal(ROLE_BADGE_TOKENS.admin.label, "Admin")
    assert.equal(ROLE_BADGE_TOKENS.creative.label, "Creative")
    assert.equal(ROLE_BADGE_TOKENS.proofing.label, "Proofing")
    assert.equal(ROLE_BADGE_TOKENS.account_executive.label, "Account Executive")
  })

  it("maps every UI state to a title and description", () => {
    for (const state of UI_STATES) {
      const definition = UI_STATE_CATALOG[state]
      assert.ok(definition.title.length > 0, `${state} missing title`)
      assert.ok(definition.description.length > 0, `${state} missing description`)
    }
  })
})

describe("release QA contract", () => {
  it("documents deferred SaaS and support surfaces as out of scope", () => {
    assert.ok(DEFERRED_FEATURE_SURFACES.includes("Hosted SaaS tenancy"))
    assert.ok(DEFERRED_FEATURE_SURFACES.includes("Paid support commitments"))
  })

  it("defines responsive breakpoints for setup, login, team, and review", () => {
    assert.ok(RESPONSIVE_BREAKPOINTS.setupMaxWidth)
    assert.ok(RESPONSIVE_BREAKPOINTS.loginMaxWidth)
    assert.ok(RESPONSIVE_BREAKPOINTS.teamTableMinWidth)
    assert.ok(RESPONSIVE_BREAKPOINTS.reviewMinWidth)
  })

  it("documents setup progress steps for first-run flows", () => {
    assert.deepEqual(
      SETUP_PROGRESS_STEPS.map((step) => step.id),
      ["admin", "studio", "smtp", "team"],
    )
  })

  it("defines destructive action confirmation tokens", () => {
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.confirmLabel, "Confirm")
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.cancelLabel, "Cancel")
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.buttonVariant, "destructive")
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.requiresAdminCapability, "data.delete")
  })

  it("marks forbidden and session-expired as public recovery routes", () => {
    const forbidden = APP_ROUTES.find((route) => route.path === "/forbidden")
    const sessionExpired = APP_ROUTES.find((route) => route.path === "/session-expired")
    assert.ok(forbidden?.implemented)
    assert.ok(sessionExpired?.implemented)
    assert.equal(forbidden?.access, "public")
    assert.equal(sessionExpired?.access, "public")
  })

  for (const role of ROLES) {
    it(`checks ${role} access to Team via direct URL contract`, () => {
      const teamRoutes = IMPLEMENTED_ROUTES.filter((route) => route.path === "/team")
      for (const route of teamRoutes) {
        const expected = role === "admin" || role === "account_executive"
        assert.equal(canRoleAccessRoute(role, route), expected, `${role} Team access mismatch`)
      }
    })
  }
})
