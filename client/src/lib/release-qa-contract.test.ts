import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  APP_ROUTES,
  buildNavTestMatrix,
  buildRouteTestMatrix,
  canRoleAccessRoute,
  DESTRUCTIVE_ACTION_TOKENS,
  getClientRoutes,
  RESPONSIVE_BREAKPOINTS,
  SETUP_PROGRESS_STEPS,
  UI_STATE_CATALOG,
  UI_STATES,
  type UserRole,
} from "@playblast/shared"

const IMPLEMENTED_ROUTES = getClientRoutes().filter((route) => route.implemented)
const ROLES: UserRole[] = ["admin", "account_executive", "creative", "proofing"]

describe("Release QA — client route guard contract", () => {
  it("covers every implemented route in the route test matrix", () => {
    const matrix = buildRouteTestMatrix()
    assert.equal(matrix.length, IMPLEMENTED_ROUTES.length * ROLES.length)
  })

  for (const role of ROLES) {
    it(`checks ${role} access to Team via direct URL contract`, () => {
      const adminRoutes = IMPLEMENTED_ROUTES.filter((route) => route.path === "/team")
      for (const route of adminRoutes) {
        const expected = role === "admin" || role === "account_executive"
        assert.equal(canRoleAccessRoute(role, route), expected, `${role} Team access mismatch`)
      }
    })
  }

  it("allows all roles to reach review and compare routes", () => {
    const reviewRoutes = IMPLEMENTED_ROUTES.filter((route) =>
      route.path.includes("/deliverables/"),
    )
    for (const route of reviewRoutes) {
      for (const role of ROLES) {
        assert.equal(canRoleAccessRoute(role, route), true, `${role} must access ${route.path}`)
      }
    }
  })

  it("keeps setup routes reachable during bootstrap for all roles in contract", () => {
    const setupRoutes = IMPLEMENTED_ROUTES.filter((route) => route.access === "setup")
    assert.ok(setupRoutes.length >= 3)
    for (const route of setupRoutes) {
      assert.equal(canRoleAccessRoute("admin", route), true)
    }
  })
})

describe("Release QA — navigation visibility contract", () => {
  it("hides Team navigation from Creative and Proofing", () => {
    const matrix = buildNavTestMatrix()
    for (const role of ["creative", "proofing"] as const) {
      const team = matrix.find((entry) => entry.itemId === "team" && entry.role === role)
      assert.ok(team)
      assert.equal(team.expectedVisibility, "hidden")
    }
  })

  it("shows Team navigation to Admin and Account Executive", () => {
    const matrix = buildNavTestMatrix()
    const team = matrix.find((entry) => entry.itemId === "team" && entry.role === "admin")
    assert.ok(team)
    assert.equal(team.expectedVisibility, "visible")
    const accountExecutiveTeam = matrix.find((entry) => entry.itemId === "team" && entry.role === "account_executive")
    assert.ok(accountExecutiveTeam)
    assert.equal(accountExecutiveTeam.expectedVisibility, "visible")
  })
})

describe("Release QA — responsive and setup surfaces", () => {
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
})

describe("Release QA — accessibility and destructive confirmations", () => {
  it("defines destructive action confirmation tokens", () => {
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.confirmLabel, "Confirm")
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.cancelLabel, "Cancel")
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.buttonVariant, "destructive")
    assert.equal(DESTRUCTIVE_ACTION_TOKENS.requiresAdminCapability, "data.delete")
  })

  it("maps every UI state to a title and description", () => {
    for (const state of UI_STATES) {
      const definition = UI_STATE_CATALOG[state]
      assert.ok(definition.title.length > 0, `${state} missing title`)
      assert.ok(definition.description.length > 0, `${state} missing description`)
    }
  })

  it("includes primary actions for auth, error, and retry states", () => {
    for (const state of ["unauthorized", "forbidden", "session_expired", "offline", "server_unavailable"] as const) {
      assert.ok(UI_STATE_CATALOG[state].primaryAction, `${state} should expose a primary action`)
    }
  })
})

describe("Release QA — stale-client authorization bypass guard", () => {
  it("marks forbidden and session-expired as public recovery routes", () => {
    const forbidden = APP_ROUTES.find((route) => route.path === "/forbidden")
    const sessionExpired = APP_ROUTES.find((route) => route.path === "/session-expired")
    assert.ok(forbidden?.implemented)
    assert.ok(sessionExpired?.implemented)
    assert.equal(forbidden?.access, "public")
    assert.equal(sessionExpired?.access, "public")
  })

  it("exposes business routes only to business roles", () => {
    const crmPaths = ["/clients", "/pipeline", "/services", "/timesheet", "/capacity"]
    for (const path of crmPaths) {
      const route = IMPLEMENTED_ROUTES.find((entry) => entry.path === path)
      assert.ok(route, `missing CRM route ${path}`)
       assert.equal(route.access, "authenticated")
       assert.equal(canRoleAccessRoute("account_executive", route), true)
      assert.equal(canRoleAccessRoute("creative", route), false)
      assert.equal(canRoleAccessRoute("proofing", route), false)
    }
  })
})
