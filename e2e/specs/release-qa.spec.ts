import { expect, test } from "@playwright/test"
import {
  BROWSER_QA_ADMIN_EMAIL,
  BROWSER_QA_ADMIN_PASSWORD,
  BROWSER_QA_CREATIVE_EMAIL,
  BROWSER_QA_CREATIVE_PASSWORD,
  BROWSER_QA_PROOFING_EMAIL,
  BROWSER_QA_PROOFING_PASSWORD,
} from "../credentials.js"

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login")
  await page.locator("#login-email").fill(email)
  await page.locator("#login-password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/($|\?)|\/projects|\/team/)
}

test.describe("Release QA — three-role browser flows", () => {
  test("Login page exposes accessible labels and focusable controls", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("#login-email")).toBeVisible()
    await expect(page.locator("#login-password")).toBeVisible()
    await page.locator("#login-email").focus()
    await expect(page.locator("#login-email")).toBeFocused()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("Admin reaches Team from the application shell", async ({ page }) => {
    await login(page, BROWSER_QA_ADMIN_EMAIL, BROWSER_QA_ADMIN_PASSWORD)
    await page.goto("/team")
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible()
  })

  test("Creative is blocked from Team via direct URL", async ({ page }) => {
    await login(page, BROWSER_QA_CREATIVE_EMAIL, BROWSER_QA_CREATIVE_PASSWORD)
    await page.goto("/team")
    await expect(page).toHaveURL(/\/forbidden/)
    await expect(page.getByRole("heading", { name: "Permission denied" })).toBeVisible()
  })

  test("Proofing is blocked from CRM via direct URL", async ({ page }) => {
    await login(page, BROWSER_QA_PROOFING_EMAIL, BROWSER_QA_PROOFING_PASSWORD)
    await page.goto("/clients")
    await expect(page).toHaveURL(/\/forbidden/)
  })

  test("Unauthenticated review URL redirects to login", async ({ page }) => {
    await page.goto("/projects")
    await expect(page).toHaveURL(/\/login/)
  })
})
