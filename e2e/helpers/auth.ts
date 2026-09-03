import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
}

export async function openAccountMenu(page: Page): Promise<void> {
  // Sidebar footer trigger shows studio name + user name.
  const trigger = page.locator('[data-sidebar="menu-button"]').filter({
    has: page.locator(".truncate"),
  }).last()
  await trigger.click()
}

export async function logout(page: Page): Promise<void> {
  await openAccountMenu(page)
  await page.getByRole("menuitem", { name: "Log out" }).click()
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
}

export async function completeFirstRunSetup(
  page: Page,
  input: {
    name: string
    email: string
    password: string
    studioName: string
  },
  baseURL = "",
): Promise<void> {
  const root = baseURL.replace(/\/$/, "")
  await page.goto(`${root}/setup`)
  await expect(page.getByRole("button", { name: "Create admin account" })).toBeVisible()
  await expect(page.getByText("Claim this self-hosted Playblast instance")).toBeVisible()

  await page.getByLabel("Your name").fill(input.name)
  await page.getByLabel("Email").fill(input.email)
  await page.getByLabel("Password", { exact: true }).fill(input.password)
  await page.getByLabel("Confirm password").fill(input.password)
  await page.getByRole("button", { name: "Create admin account" }).click()

  await page.waitForURL(/\/setup\/studio/)
  await page.locator("#studio-name").fill(input.studioName)
  await page.getByRole("button", { name: "Continue" }).click()

  await page.waitForURL(/\/setup\/complete/)
  await page.getByRole("button", { name: "Continue to Playblast" }).click()
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/projects")
}

export async function configureSmtpViaUi(
  page: Page,
  input: { host: string; fromEmail: string; instanceUrl: string },
): Promise<void> {
  await page.goto("/team")
  await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible({
    timeout: 20_000,
  })

  const smtpHost = page.locator("#smtp-host")
  if (!(await smtpHost.isVisible().catch(() => false))) {
    const retry = page.getByRole("button", { name: "Try again" })
    if (await retry.isVisible().catch(() => false)) {
      await retry.click()
    }
  }
  await expect(smtpHost).toBeVisible({ timeout: 20_000 })

  await smtpHost.fill(input.host)
  await page.locator("#smtp-port").fill("587")
  await page.locator("#smtp-username").fill("e2e-smtp-user")
  await page.locator("#smtp-password").fill("e2e-smtp-password-fixture")
  await page.locator("#smtp-from").fill(input.fromEmail)
  await page.locator("#smtp-instance-url").fill(input.instanceUrl)
  await page.getByRole("button", { name: "Save SMTP settings" }).click()
  await page.getByRole("button", { name: "Send test email" }).click()
  await expect(page.getByRole("button", { name: "Invite member" })).toBeEnabled({
    timeout: 15_000,
  })
}

export async function inviteMemberViaUi(
  page: Page,
  input: { name: string; email: string; role: "creative" | "proofing" },
): Promise<void> {
  await page.goto("/team")
  await page.getByRole("button", { name: "Invite member" }).click()
  await expect(page.getByText("Invite a team member")).toBeVisible()
  await page.locator("#invite-name").fill(input.name)
  await page.locator("#invite-email").fill(input.email)
  if (input.role !== "creative") {
    await page.locator("#invite-role").click()
    await page.getByRole("option", { name: "Proofing" }).click()
  }
  await page.getByRole("button", { name: "Send invitation" }).click()
  await expect(page.getByText(input.email)).toBeVisible({ timeout: 15_000 })
}

export async function acceptInviteViaUi(
  page: Page,
  token: string,
  password: string,
): Promise<void> {
  await page.goto(`/invite/${token}`)
  await page.locator("#invite-password").fill(password)
  await page.locator("#invite-confirm-password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/invite"))
}
