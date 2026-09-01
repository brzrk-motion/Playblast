import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  APP_ROUTES,
  canRoleAccessRoute,
  type UserRole,
} from "@playblast/shared"

describe("role-restricted route guard contract", () => {
  const implementedRoutes = APP_ROUTES.filter(
    (route) => route.implemented && route.path !== "/health",
  )

  for (const role of ["creative", "proofing"] as const satisfies UserRole[]) {
    it(`denies ${role} users from admin-only CRM routes`, () => {
      const adminRoutes = implementedRoutes.filter((route) => route.access === "admin")
      for (const route of adminRoutes) {
        assert.equal(
          canRoleAccessRoute(role, route),
          false,
          `${role} should not access ${route.path}`,
        )
      }
    })
  }

  it("allows proofing users to reach review routes", () => {
    const reviewRoutes = implementedRoutes.filter((route) =>
      route.path.includes("/deliverables/"),
    )

    for (const route of reviewRoutes) {
      assert.equal(canRoleAccessRoute("proofing", route), true)
    }
  })
})
