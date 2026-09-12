import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  assertAdminSuperset,
  buildCapabilityTestMatrix,
  buildNavTestMatrix,
  buildRouteTestMatrix,
  canRoleAccessRoute,
  getClientRoutes,
  getNavVisibility,
  getUiStateForErrorCode,
  hasCapability,
  ROLE_CAPABILITY_MATRIX,
  CAPABILITIES,
  USER_ROLES,
} from "./index.js"

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
  })

  it("denies proofing upload and delete capabilities", () => {
    assert.equal(hasCapability("proofing", "media.upload"), false)
    assert.equal(hasCapability("proofing", "data.delete"), false)
    assert.equal(hasCapability("proofing", "comments.create"), true)
  })
})

describe("route and navigation crosswalk", () => {
  it("maps business routes to business capability access", () => {
    const adminOnly = getClientRoutes().filter((route) =>
      ["/clients", "/pipeline", "/services", "/timesheet", "/capacity"].includes(route.path),
    )

    assert.equal(adminOnly.length, 5)
    for (const route of adminOnly) {
       assert.equal(route.access, "authenticated")
       assert.equal(canRoleAccessRoute("account_executive", route), true)
      assert.equal(canRoleAccessRoute("creative", route), false)
       assert.equal(canRoleAccessRoute("proofing", route), false)
       assert.equal(canRoleAccessRoute("admin", route), true)
    }
  })

  it("hides deferred CRM nav items from creative and proofing", () => {
    for (const itemId of ["pipeline", "clients", "services", "timesheet", "capacity"]) {
      assert.equal(getNavVisibility("creative", itemId), "hidden")
      assert.equal(getNavVisibility("proofing", itemId), "hidden")
      assert.equal(getNavVisibility("admin", itemId), "visible")
    }
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
  })
})

describe("ui state mapping", () => {
  it("maps session expiry to the session_expired state", () => {
    assert.equal(getUiStateForErrorCode("SESSION_EXPIRED"), "session_expired")
    assert.equal(getUiStateForErrorCode("DELIVERY_FAILED"), "delivery_failure")
  })
})
