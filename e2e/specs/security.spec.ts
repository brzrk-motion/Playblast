import { expect, test, runtime } from "../fixtures/test.js"
import { apiFetch, apiLogin, cookieHeader } from "../helpers/api.js"
import { E2E_ADMIN, E2E_CREATIVE } from "../credentials.js"
import {
  extractInviteToken,
  waitForInviteEmail,
} from "../helpers/smtp-capture.js"
import { inviteMemberViaUi, loginAs, logout } from "../helpers/auth.js"
import Database from "better-sqlite3"

test("Unauthenticated API and UI redirects", async ({ page, request }) => {
  const { baseUrl } = runtime()
  const api = await request.get(`${baseUrl}/api/projects`)
  expect(api.status()).toBe(401)

  await page.goto("/projects")
  await expect(page).toHaveURL(/\/login/)
})

test("CSRF mutation without token is rejected", async () => {
  const { baseUrl } = runtime()
  const session = await apiLogin(baseUrl, E2E_ADMIN.email, E2E_ADMIN.password)
  expect(session.cookies.length).toBeGreaterThan(0)
  const response = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(session.cookies),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "CSRF Should Fail" }),
  })
  expect([401, 403]).toContain(response.status)
  if (session.cookies.some((entry) => entry.includes("playblast_session"))) {
    expect(response.status).toBe(403)
  }
})

test("Invite revoke, replay, and expiry are denied", async ({ page }) => {
  const { baseUrl, smtpCaptureDir, dbPath } = runtime()
  await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)

  const email = `revoke-${Date.now()}@e2e.fixture`
  await inviteMemberViaUi(page, {
    name: "Revoke Target",
    email,
    role: "creative",
  })
  const mail = await waitForInviteEmail(smtpCaptureDir, email)
  const token = extractInviteToken(mail)

  const session = await apiLogin(baseUrl, E2E_ADMIN.email, E2E_ADMIN.password)
  const invitations = await apiFetch(baseUrl, "/api/invitations", {
    cookies: session.cookies,
    csrfToken: session.csrfToken,
  })
  expect(invitations.status).toBe(200)
  const list = (await invitations.json()) as Array<{ id: string; email: string }>
  const invite = list.find((row) => row.email === email)
  expect(invite).toBeTruthy()

  const revoke = await apiFetch(baseUrl, `/api/invitations/${invite!.id}/revoke`, {
    method: "POST",
    cookies: session.cookies,
    csrfToken: session.csrfToken,
    body: {},
  })
  expect(revoke.status).toBe(200)

  const preview = await fetch(`${baseUrl}/api/invites/${token}`)
  expect(preview.status).toBe(410)

  await logout(page)
  await page.goto(`/invite/${token}`)
  await expect(page.getByText("Invitation unavailable").first()).toBeVisible()

  const expireEmail = `expire-${Date.now()}@e2e.fixture`
  await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await inviteMemberViaUi(page, {
    name: "Expire Target",
    email: expireEmail,
    role: "proofing",
  })
  const expireMail = await waitForInviteEmail(smtpCaptureDir, expireEmail)
  const expireToken = extractInviteToken(expireMail)

  const db = new Database(dbPath)
  db.prepare(
    `UPDATE invitations SET expires_at = ?, status = 'pending' WHERE email = ?`,
  ).run(new Date(Date.now() - 60_000).toISOString(), expireEmail)
  db.close()

  const expiredPreview = await fetch(`${baseUrl}/api/invites/${expireToken}`)
  expect(expiredPreview.status).toBe(410)

  const replayEmail = `replay-${Date.now()}@e2e.fixture`
  await inviteMemberViaUi(page, {
    name: "Replay Target",
    email: replayEmail,
    role: "creative",
  })
  const replayMail = await waitForInviteEmail(smtpCaptureDir, replayEmail)
  const replayToken = extractInviteToken(replayMail)
  await logout(page)
  await page.goto(`/invite/${replayToken}`)
  await page.locator("#invite-password").fill(E2E_CREATIVE.password)
  await page.locator("#invite-confirm-password").fill(E2E_CREATIVE.password)
  await page.getByRole("button", { name: "Create account" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/invite"))
  await logout(page)
  const replayPreview = await fetch(`${baseUrl}/api/invites/${replayToken}`)
  expect(replayPreview.status).toBe(409)
  await page.goto(`/invite/${replayToken}`)
  await expect(page.getByText("Invitation unavailable").first()).toBeVisible()
})

test("Cross-studio project id is not readable", async () => {
  const { baseUrl, dbPath } = runtime()
  const otherProjectId = "00000000-0000-4000-8000-00000000e2e1"
  const db = new Database(dbPath)
  const now = new Date().toISOString()
  db.prepare(
    `INSERT OR IGNORE INTO studios (id, name, setup_status, created_at, updated_at)
     VALUES (?, ?, 'complete', ?, ?)`,
  ).run("studio-e2e-other", "Other Studio", now, now)
  db.prepare(
    `INSERT OR IGNORE INTO projects (id, name, createdAt, status, studioId)
     VALUES (?, ?, ?, 'active', ?)`,
  ).run(otherProjectId, "Foreign Project", now, "studio-e2e-other")
  db.close()

  const session = await apiLogin(baseUrl, E2E_CREATIVE.email, E2E_CREATIVE.password)
  const response = await apiFetch(baseUrl, `/api/projects/${otherProjectId}`, {
    cookies: session.cookies,
    csrfToken: session.csrfToken,
  })
  expect([403, 404]).toContain(response.status)
})
