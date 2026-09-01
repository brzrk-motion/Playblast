import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  APP_ROUTES,
  buildCapabilityTestMatrix,
  buildNavTestMatrix,
  buildRouteTestMatrix,
  canRoleAccessRoute,
  createApiError,
  DEFERRED_FEATURE_SURFACES,
  getHttpStatusForErrorCode,
  getNavVisibility,
  hasCapability,
  MVP_CRM_ROUTES_ADMIN_ONLY,
  assertAdminSuperset,
} from "@playblast/shared"

describe("Phase 0 server capability contract", () => {
  it("exposes a complete capability matrix", () => {
    assert.doesNotThrow(() => assertAdminSuperset())
    assert.equal(buildCapabilityTestMatrix().length, 48)
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

  it("denies proofing structural mutations", () => {
    assert.equal(hasCapability("proofing", "projects.mutate"), false)
    assert.equal(hasCapability("proofing", "approval.mutate"), false)
    assert.equal(hasCapability("creative", "approval.mutate"), true)
  })
})

describe("Phase 0 integration crosswalk", () => {
  it("aligns route access with navigation visibility for CRM surfaces", () => {
    for (const path of MVP_CRM_ROUTES_ADMIN_ONLY) {
      const route = APP_ROUTES.find((entry) => entry.path === path)
      assert.ok(route, `missing route ${path}`)
      assert.equal(route.access, "admin")
      assert.equal(canRoleAccessRoute("creative", route), false)

      const navId = path.slice(1)
      assert.equal(getNavVisibility("creative", navId), "hidden")
      assert.equal(getNavVisibility("admin", navId), "visible")
    }
  })

  it("documents deferred SaaS and support surfaces as out of scope", () => {
    assert.ok(DEFERRED_FEATURE_SURFACES.includes("Hosted SaaS tenancy"))
    assert.ok(DEFERRED_FEATURE_SURFACES.includes("Paid support commitments"))
  })

  it("builds route and nav matrices for fixtures", () => {
    assert.ok(buildRouteTestMatrix().length > 0)
    assert.ok(buildNavTestMatrix().length > 0)
  })
})
