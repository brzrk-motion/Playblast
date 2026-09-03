import {
  APP_ROUTES,
  canRoleAccessRoute,
  getNavVisibility,
} from "@playblast/shared"
import { apiFetch, apiLogin } from "../helpers/api.js"
import { E2E_ADMIN, E2E_CREATIVE, E2E_PROOFING } from "../credentials.js"
import { expect, runtime, storageStateFor, test } from "../fixtures/test.js"

const ROLE_CREDS = {
  admin: E2E_ADMIN,
  creative: E2E_CREATIVE,
  proofing: E2E_PROOFING,
} as const

test.describe("Admin UI", () => {
  test.use({ storageState: storageStateFor("admin") })

  test("Admin can open Team and CRM routes", async ({ page }) => {
    await page.goto("/team")
    await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible()
    await page.goto("/clients")
    await expect(page).not.toHaveURL(/\/forbidden|\/login/)
  })

  test("Admin nav shows Team", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: "Team" })).toBeVisible()
  })

  test("nav visibility contract smoke", async ({ page }) => {
    await page.goto("/")
    expect(getNavVisibility("admin", "team")).toBe("visible")
    expect(getNavVisibility("creative", "team")).toBe("hidden")
    await expect(page.getByRole("link", { name: "Team" })).toBeVisible()
  })
})

test.describe("Creative UI", () => {
  test.use({ storageState: storageStateFor("creative") })

  test("Creative is redirected from Team", async ({ page }) => {
    await page.goto("/team")
    await expect(page).toHaveURL(/\/forbidden/)
    await expect(page.getByText("Permission denied")).toBeVisible()
  })

  test("Creative is redirected from Clients", async ({ page }) => {
    await page.goto("/clients")
    await expect(page).toHaveURL(/\/forbidden/)
  })

  test("Creative can open Projects", async ({ page }) => {
    await page.goto("/projects")
    await expect(page).not.toHaveURL(/\/forbidden|\/login/)
  })
})

test.describe("Proofing UI", () => {
  test.use({ storageState: storageStateFor("proofing") })

  test("Proofing is redirected from Team and CRM", async ({ page }) => {
    await page.goto("/team")
    await expect(page).toHaveURL(/\/forbidden/)
    await page.goto("/clients")
    await expect(page).toHaveURL(/\/forbidden/)
    await page.goto("/services")
    await expect(page).toHaveURL(/\/forbidden/)
  })

  test("Proofing can open Projects list", async ({ page }) => {
    await page.goto("/projects")
    await expect(page).not.toHaveURL(/\/forbidden|\/login/)
  })
})

const ROUTE_CASES = APP_ROUTES.filter(
  (entry) =>
    entry.implemented &&
    !entry.path.includes(":") &&
    entry.path !== "/health" &&
    entry.access !== "setup" &&
    entry.path !== "/login",
)

for (const role of ["admin", "creative", "proofing"] as const) {
  test.describe(`${role} route contract`, () => {
    test.use({ storageState: storageStateFor(role) })

    for (const route of ROUTE_CASES) {
      const allowed = canRoleAccessRoute(role, route)
      test(`${role} route ${route.path} → ${allowed ? "allow" : "deny"}`, async ({
        page,
      }) => {
        await page.goto(route.path)
        if (route.access === "public") {
          await expect(page).not.toHaveURL(/\/login$/)
          return
        }
        if (allowed) {
          await expect(page).not.toHaveURL(/\/forbidden/)
          await expect(page).not.toHaveURL(/\/login/)
          await expect(page.getByRole("main").last()).toBeVisible()
          await expect(page.getByText(/Something went wrong|Server unavailable/i)).toHaveCount(0)
        } else {
          await expect(page).toHaveURL(/\/forbidden/)
        }
      })
    }
  })
}

test("probes representative capability endpoints per role", async () => {
  const { baseUrl } = runtime()
  const cases: Array<{
    role: keyof typeof ROLE_CREDS
    path: string
    method: string
    expectedAllow: boolean
    body?: unknown
  }> = [
    { role: "admin", path: "/api/users", method: "GET", expectedAllow: true },
    { role: "creative", path: "/api/users", method: "GET", expectedAllow: false },
    { role: "proofing", path: "/api/users", method: "GET", expectedAllow: false },
    { role: "admin", path: "/api/smtp", method: "GET", expectedAllow: true },
    { role: "creative", path: "/api/smtp", method: "GET", expectedAllow: false },
    { role: "proofing", path: "/api/clients", method: "GET", expectedAllow: false },
    {
      role: "creative",
      path: "/api/invitations",
      method: "POST",
      expectedAllow: false,
      body: { name: "Privilege Attempt", email: "blocked@e2e.fixture", role: "admin" },
    },
    {
      role: "proofing",
      path: "/api/users/00000000-0000-4000-8000-000000000001",
      method: "PATCH",
      expectedAllow: false,
      body: { role: "admin", disabled: false },
    },
    {
      role: "creative",
      path: "/api/projects/00000000-0000-4000-8000-000000000001",
      method: "DELETE",
      expectedAllow: false,
    },
    {
      role: "proofing",
      path: "/api/projects/00000000-0000-4000-8000-000000000001",
      method: "PATCH",
      expectedAllow: false,
      body: { name: "Manipulated Project" },
    },
    {
      role: "proofing",
      path: "/api/projects/00000000-0000-4000-8000-000000000001/deliverables",
      method: "POST",
      expectedAllow: false,
      body: { name: "Manipulated Deliverable" },
    },
    {
      role: "proofing",
      path: "/api/versions/00000000-0000-4000-8000-000000000001/status",
      method: "PATCH",
      expectedAllow: false,
      body: { status: "approved" },
    },
    {
      role: "proofing",
      path: "/api/projects",
      method: "POST",
      expectedAllow: false,
      body: { name: "Should Deny" },
    },
    {
      role: "creative",
      path: "/api/projects",
      method: "POST",
      expectedAllow: true,
      body: { name: "Creative API Project" },
    },
    { role: "proofing", path: "/api/projects", method: "GET", expectedAllow: true },
  ]

  for (const entry of cases) {
    const creds = ROLE_CREDS[entry.role]
    const session = await apiLogin(baseUrl, creds.email, creds.password)
    const response = await apiFetch(baseUrl, entry.path, {
      method: entry.method,
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      body: entry.body,
    })
    if (entry.expectedAllow) {
      expect(response.status, `${entry.role} ${entry.method} ${entry.path}`).toBeLessThan(400)
    } else {
      expect(response.status, `${entry.role} ${entry.method} ${entry.path}`).toBe(403)
    }
  }
})
