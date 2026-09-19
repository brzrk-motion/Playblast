/**
 * Optional follow-up E2E (BRZ-195): Admin SMTP test-send via Team UI, asserted through
 * the Mailpit HTTP API — not UI scraping and not file capture.
 *
 * Uses Mailpit dev routing (MAILPIT_URL + NODE_ENV=development) so production catcher
 * refusal does not block localhost:1025. Invite flows continue to use file capture
 * in auth.setup.ts.
 *
 * Run: npm run test:e2e:mailpit (starts Mailpit via Docker when available)
 * Or set MAILPIT_URL and run: npx playwright test --project=mailpit
 */
import { expect, test } from "@playwright/test"
import { E2E_ADMIN } from "../credentials.js"
import { completeFirstRunSetup } from "../helpers/auth.js"
import {
  deleteAllMailpitMessages,
  getMailpitMessage,
  isMailpitReachable,
  resolveMailpitUrlFromEnv,
  waitForMailpitMessage,
} from "../helpers/mailpit.js"
import {
  startMailpitE2EServer,
  stopMailpitE2EServer,
  type MailpitE2EServer,
} from "../helpers/mailpit-server.js"

const mailpitUrl = resolveMailpitUrlFromEnv()
let mailpitAvailable = false
let server: MailpitE2EServer | undefined

test.describe("Admin SMTP via Mailpit API", () => {
  test.beforeAll(async () => {
    if (!mailpitUrl) {
      return
    }
    mailpitAvailable = await isMailpitReachable(mailpitUrl)
    if (!mailpitAvailable) {
      return
    }

    await deleteAllMailpitMessages(mailpitUrl)
    server = await startMailpitE2EServer()
  })

  test.afterAll(async () => {
    if (server) {
      await stopMailpitE2EServer(server)
      server = undefined
    }
  })

  test("Admin sends test email through Mailpit dev routing", async ({ page }) => {
    test.skip(
      !mailpitUrl,
      "MAILPIT_URL is not set — optional Mailpit E2E skipped (see npm run test:e2e:mailpit)",
    )
    test.skip(!mailpitAvailable, "Mailpit is not reachable at MAILPIT_URL")

    const activeServer = server!

    await completeFirstRunSetup(
      page,
      {
        name: E2E_ADMIN.name,
        email: E2E_ADMIN.email,
        password: E2E_ADMIN.password,
        studioName: "Mailpit E2E Studio",
      },
      activeServer.baseUrl,
    )

    await page.goto(`${activeServer.baseUrl}/team`)
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      page.getByText(/routes outbound mail through the local Mailpit catcher/i),
    ).toBeVisible({ timeout: 20_000 })

    await page.getByRole("button", { name: "Send test email" }).click()
    await expect(page.getByRole("button", { name: "Invite member" })).toBeEnabled({
      timeout: 15_000,
    })

    const summary = await waitForMailpitMessage(mailpitUrl!, E2E_ADMIN.email, {
      subjectIncludes: "Playblast SMTP test",
      timeoutMs: 15_000,
    })

    const message = await getMailpitMessage(mailpitUrl!, summary.ID)
    expect(message.Subject).toBe("Playblast SMTP test")
    expect(message.Text).toContain("SMTP delivery is working")
    expect(message.HTML).toContain("SMTP delivery is working")
  })
})
