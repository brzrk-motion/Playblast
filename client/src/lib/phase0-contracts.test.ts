import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  APP_ROUTES,
  canRoleAccessRoute,
  getNavVisibility,
  getUiStateForErrorCode,
  ROLE_BADGE_TOKENS,
  UI_STATE_CATALOG,
} from "@playblast/shared"
import { getMvpNavItemsForRole, mapApiErrorToUiState } from "./mvp-contracts.js"

describe("Phase 0 client route map", () => {
  it("classifies implemented proofing routes as authenticated", () => {
    const reviewRoute = APP_ROUTES.find(
      (route) => route.path === "/projects/:projectId/deliverables/:deliverableId",
    )
    assert.ok(reviewRoute)
    assert.equal(reviewRoute.access, "authenticated")
    assert.equal(canRoleAccessRoute("proofing", reviewRoute), true)
  })

  it("keeps CRM routes admin-only in the contract", () => {
    for (const path of ["/clients", "/pipeline", "/services", "/timesheet", "/capacity"]) {
      const route = APP_ROUTES.find((entry) => entry.path === path)
      assert.ok(route)
      assert.equal(canRoleAccessRoute("creative", route), false)
    }
  })
})

describe("Phase 0 client navigation contract", () => {
  it("returns only visible nav items for each role", () => {
    const adminMain = getMvpNavItemsForRole("admin", "main")
    const proofingMain = getMvpNavItemsForRole("proofing", "main")

    assert.ok(adminMain.some((item) => item.id === "clients"))
    assert.equal(proofingMain.some((item) => item.id === "clients"), false)
    assert.equal(getNavVisibility("proofing", "projects"), "visible")
  })
})

describe("Phase 0 client UI states", () => {
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

  it("maps API error codes to UI states", () => {
    assert.equal(mapApiErrorToUiState("FORBIDDEN"), "forbidden")
    assert.equal(getUiStateForErrorCode("INVITE_REVOKED"), "invite_expired")
  })

  it("defines role badge tokens for all roles", () => {
    assert.equal(ROLE_BADGE_TOKENS.admin.label, "Admin")
    assert.equal(ROLE_BADGE_TOKENS.creative.label, "Creative")
    assert.equal(ROLE_BADGE_TOKENS.proofing.label, "Proofing")
  })
})
