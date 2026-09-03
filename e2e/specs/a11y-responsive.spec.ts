import { expect, storageStateFor, test } from "../fixtures/test.js"

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const

test.describe("Responsive and accessibility smoke", () => {
  test.use({ storageState: storageStateFor("admin") })

  for (const viewport of viewports) {
    test(`${viewport.name}: shell surfaces stay usable`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })

      await page.goto("/team")
      await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible()

      await page.goto("/profile")
      await expect(page.getByRole("heading", { name: "Profile", level: 2 })).toBeVisible()

      await page.goto("/projects")
      await expect(page).not.toHaveURL(/\/forbidden|\/login/)

      await page.goto("/forbidden")
      await expect(page.getByText("Permission denied")).toBeVisible()
    })
  }
})

test("login form labels remain accessible when logged out", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined })
  const page = await context.newPage()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/login")
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
  await page.getByLabel("Email").focus()
  await expect(page.getByLabel("Email")).toBeFocused()
  await context.close()
})
