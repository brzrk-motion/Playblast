import { expect, type Page } from "@playwright/test"

export async function waitForApplicationApi(
  baseUrl: string,
  options: {
    setupStatus?: "pending" | "complete"
    timeoutMs?: number
  } = {},
): Promise<void> {
  const { setupStatus = "complete", timeoutMs = 120_000 } = options
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    try {
      const [health, setup] = await Promise.all([
        fetch(`${baseUrl}/health`),
        fetch(`${baseUrl}/api/setup/status`),
      ])
      if (!health.ok || !setup.ok) {
        throw new Error("health or setup request failed")
      }

      const healthBody = (await health.json()) as { status?: string }
      const setupBody = (await setup.json()) as { status?: string }
      if (healthBody.status === "ok" && setupBody.status === setupStatus) {
        return
      }
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(
    `application API did not reach setup=${setupStatus} within ${timeoutMs}ms`,
  )
}

export async function retryChunkLoadErrors(page: Page, maxAttempts = 5): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const chunkFailure = page.getByText("This page failed to load")
    if (await chunkFailure.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Try again" }).click()
      await page.waitForLoadState("networkidle")
      continue
    }
    break
  }
}

export async function expectBootstrapSetupPage(page: Page): Promise<void> {
  await expect(async () => {
    await retryChunkLoadErrors(page)
    const createButton = page.getByRole("button", { name: "Create admin account" })
    if (!(await createButton.isVisible().catch(() => false))) {
      await page.reload({ waitUntil: "domcontentloaded" })
      await retryChunkLoadErrors(page)
    }
    await expect(createButton).toBeVisible({ timeout: 10_000 })
  }).toPass({ timeout: 60_000 })
}

export async function expectAuthenticatedProjectsPage(
  page: Page,
  baseUrl: string,
  studioName = "Docker E2E Studio",
): Promise<void> {
  await page.goto(`${baseUrl}/projects`, { waitUntil: "domcontentloaded" })
  await retryChunkLoadErrors(page)
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByText(studioName).first()).toBeVisible({
    timeout: 60_000,
  })

  // Projects is a lazy route; retry once the shell is hydrated after container restart.
  await expect(async () => {
    await retryChunkLoadErrors(page)
    if (
      !(await page
        .getByRole("heading", { name: "Projects", level: 1 })
        .isVisible()
        .catch(() => false))
    ) {
      await page.reload({ waitUntil: "domcontentloaded" })
      await retryChunkLoadErrors(page)
    }
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible({
      timeout: 15_000,
    })
  }).toPass({ timeout: 60_000 })
}
