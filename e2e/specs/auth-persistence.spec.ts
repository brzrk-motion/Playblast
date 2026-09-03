import { expect, storageStateFor, test } from "../fixtures/test.js"
import { loginAs, logout, inviteMemberViaUi, acceptInviteViaUi } from "../helpers/auth.js"
import { E2E_ADMIN, E2E_CREATIVE } from "../credentials.js"
import { extractInviteToken, waitForInviteEmail } from "../helpers/smtp-capture.js"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { writeRuntimeState, readRuntimeState } from "../helpers/runtime.js"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function waitForPidExit(pid: number, timeoutMs = 10_000): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (!isPidAlive(pid)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`server process ${pid} did not exit after SIGTERM`)
}

test("Admin logout then login restores access", async ({ page }) => {
  await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await page.goto("/team")
  await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible()
  await logout(page)
  await page.goto("/team")
  await expect(page).toHaveURL(/\/login/)
  await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await page.goto("/team")
  await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible()
})

test("Server restart preserves the database and authenticated session", async ({ page }) => {
  const state = readRuntimeState()
  const oldPid = state.serverPid

  await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await page.goto("/team")
  await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible()

  try {
    process.kill(-oldPid, "SIGTERM")
  } catch {
    try {
      process.kill(oldPid, "SIGTERM")
    } catch {
      // already gone
    }
  }

  await waitForPidExit(oldPid)

  const child = spawn(process.execPath, [path.join(repoRoot, "server/dist/e2e-entry.js")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(state.port),
      DB_PATH: state.dbPath,
      UPLOAD_DIR: state.uploadDir,
      SESSION_SECRET: "e2e-local-session-secret-32chars-min",
      PLAYBLAST_E2E_TEST_MODE: "1",
      PLAYBLAST_SMTP_CAPTURE_DIR: state.smtpCaptureDir,
      PLAYBLAST_EMERGENCY_BASIC_AUTH: "false",
      PLAYBLAST_E2E_RELAX_RATE_LIMITS: "1",
    },
    stdio: "ignore",
    detached: true,
  })
  if (!child.pid) {
    throw new Error("failed to restart server")
  }
  writeRuntimeState({ ...state, serverPid: child.pid })
  child.unref()

  const started = Date.now()
  let healthy = false
  while (Date.now() - started < 30_000) {
    if (!isPidAlive(child.pid)) {
      throw new Error("restarted server exited before becoming healthy")
    }
    try {
      const health = await fetch(`${state.baseUrl}/health`)
      if (health.ok) {
        const body = (await health.json()) as { storage?: { dbPath?: string } }
        if (
          body.storage?.dbPath &&
          path.resolve(body.storage.dbPath) === path.resolve(state.dbPath)
        ) {
          healthy = true
          break
        }
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (!healthy) {
    throw new Error("restarted server did not become healthy with the E2E database")
  }

  await page.goto("/team")
  await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible()
  await expect(page.getByText(E2E_ADMIN.email).first()).toBeVisible()
})

test.describe("Team membership controls", () => {
  test.use({ storageState: storageStateFor("admin") })

  test("Admin sees members with assigned roles", async ({ page }) => {
    await page.goto("/team")
    await expect(page.getByRole("heading", { name: "Team", level: 2 })).toBeVisible()
    await expect(page.getByText(E2E_ADMIN.email).first()).toBeVisible()
    await expect(page.getByText("creative@e2e.fixture").first()).toBeVisible()
    await expect(page.getByText("proofing@e2e.fixture").first()).toBeVisible()
    await expect(page.getByText("Creative").first()).toBeVisible()
    await expect(page.getByText("Proofing").first()).toBeVisible()
  })

  test("Admin changes a member role, disables login, and reactivates the account", async ({
    page,
  }) => {
    const { baseUrl, smtpCaptureDir } = readRuntimeState()
    const email = `lifecycle-${Date.now()}@e2e.fixture`

    await page.context().clearCookies()
    await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
    await inviteMemberViaUi(page, {
      name: "Lifecycle Member",
      email,
      role: "creative",
    })
    const invitation = await waitForInviteEmail(smtpCaptureDir, email)
    await logout(page)
    await acceptInviteViaUi(page, extractInviteToken(invitation), E2E_CREATIVE.password)
    await logout(page)
    await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
    await page.goto("/team")

    let row = page.getByRole("row").filter({ hasText: email })
    await row.getByRole("combobox").click()
    await page.getByRole("option", { name: "Proofing" }).click()
    await expect(row.getByText("Proofing").first()).toBeVisible()

    await row.getByRole("button", { name: "Disable" }).click()
    await expect(row.getByText("Disabled")).toBeVisible()

    const deniedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: E2E_CREATIVE.password }),
    })
    expect(deniedLogin.status).toBe(401)

    row = page.getByRole("row").filter({ hasText: email })
    await row.getByRole("button", { name: "Reactivate" }).click()
    await expect(row.getByText("Active")).toBeVisible()
    await logout(page)
    await loginAs(page, email, E2E_CREATIVE.password)
    await page.goto("/projects")
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible()
  })
})
