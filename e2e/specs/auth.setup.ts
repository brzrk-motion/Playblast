import fs from "node:fs"
import path from "node:path"
import { test as setup } from "@playwright/test"
import { E2E_ADMIN, E2E_CREATIVE, E2E_PROOFING } from "../credentials.js"
import {
  acceptInviteViaUi,
  completeFirstRunSetup,
  configureSmtpViaUi,
  inviteMemberViaUi,
  loginAs,
  logout,
} from "../helpers/auth.js"
import { authDir, readRuntimeState } from "../helpers/runtime.js"
import {
  extractInviteToken,
  waitForInviteEmail,
} from "../helpers/smtp-capture.js"

const adminFile = path.join(authDir(), "admin.json")
const creativeFile = path.join(authDir(), "creative.json")
const proofingFile = path.join(authDir(), "proofing.json")

setup.setTimeout(180_000)

setup("bootstrap admin, SMTP capture, and role invites", async ({ page }) => {
  const state = readRuntimeState()

  await completeFirstRunSetup(page, {
    name: E2E_ADMIN.name,
    email: E2E_ADMIN.email,
    password: E2E_ADMIN.password,
    studioName: "E2E Studio",
  })

  await configureSmtpViaUi(page, {
    host: "smtp.e2e.capture",
    fromEmail: "noreply@e2e.fixture",
    instanceUrl: state.baseUrl,
  })

  await inviteMemberViaUi(page, {
    name: E2E_CREATIVE.name,
    email: E2E_CREATIVE.email,
    role: "creative",
  })
  const creativeMail = await waitForInviteEmail(
    state.smtpCaptureDir,
    E2E_CREATIVE.email,
  )
  const creativeToken = extractInviteToken(creativeMail)

  await logout(page)
  await acceptInviteViaUi(page, creativeToken, E2E_CREATIVE.password)
  await logout(page)

  await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await inviteMemberViaUi(page, {
    name: E2E_PROOFING.name,
    email: E2E_PROOFING.email,
    role: "proofing",
  })
  const proofingMail = await waitForInviteEmail(
    state.smtpCaptureDir,
    E2E_PROOFING.email,
  )
  const proofingToken = extractInviteToken(proofingMail)

  await logout(page)
  await acceptInviteViaUi(page, proofingToken, E2E_PROOFING.password)
  await logout(page)

  // Fresh logins after invite acceptance — logout invalidates sessions, so
  // storage states must be captured from live sessions that stay signed in.
  await loginAs(page, E2E_CREATIVE.email, E2E_CREATIVE.password)
  await page.context().storageState({ path: creativeFile })
  await page.context().clearCookies()

  await loginAs(page, E2E_PROOFING.email, E2E_PROOFING.password)
  await page.context().storageState({ path: proofingFile })
  await page.context().clearCookies()

  await loginAs(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await page.context().storageState({ path: adminFile })

  for (const file of [adminFile, creativeFile, proofingFile]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing storage state: ${file}`)
    }
    fs.chmodSync(file, 0o600)
  }
})
