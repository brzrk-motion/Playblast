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
} from "./index.js"

describe("role capability contract", () => {
  it("defines every capability for every role", () => {
    for (const capability of Object.keys(ROLE_CAPABILITY_MATRIX)) {
      assert.equal(typeof ROLE_CAPABILITY_MATRIX[capability as keyof typeof ROLE_CAPABILITY_MATRIX].admin, "string")
      assert.equal(typeof ROLE_CAPABILITY_MATRIX[capability as keyof typeof ROLE_CAPABILITY_MATRIX].creative, "string")
      assert.equal(typeof ROLE_CAPABILITY_MATRIX[capability as keyof typeof ROLE_CAPABILITY_MATRIX].proofing, "string")
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
  it("maps CRM routes to admin-only access", () => {
    const adminOnly = getClientRoutes().filter((route) =>
      ["/clients", "/pipeline", "/services", "/timesheet", "/capacity"].includes(route.path),
    )

    assert.equal(adminOnly.length, 5)
    for (const route of adminOnly) {
      assert.equal(route.access, "admin")
      assert.equal(canRoleAccessRoute("creative", route), false)
      assert.equal(canRoleAccessRoute("proofing", route), false)
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
    assert.equal(matrix.length, 48)
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
