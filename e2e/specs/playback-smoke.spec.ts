import { expect, runtime, storageStateFor, test } from "../fixtures/test.js"
import { apiFetch, apiLogin } from "../helpers/api.js"
import {
  expectVideoNear,
  SEEK_TOLERANCE_SEC,
  videoInPane,
  waitForVideoReady,
} from "../helpers/playback.js"
import {
  seedPlaybackFixture,
  type PlaybackFixture,
} from "../helpers/seed-playback-fixture.js"
import { E2E_PROOFING } from "../credentials.js"

let fixture: PlaybackFixture

test.describe.configure({ mode: "serial" })

test.describe("Playback smokes", () => {
  test.use({ storageState: storageStateFor("proofing") })

  test.beforeAll(async () => {
    const { baseUrl } = runtime()
    fixture = await seedPlaybackFixture(baseUrl)
  })

  test("seek accuracy smoke lands near the requested playhead", async ({ page }) => {
    const reviewUrl =
      `/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}?version=${fixture.versionBLabel}`
    await page.goto(reviewUrl)

    const video = page.locator("video").first()
    const duration = await waitForVideoReady(page, video)
    expect(duration).toBeGreaterThan(5)

    await page.locator("body").click()
    await page.keyboard.press("l")

    const expectedSeconds = 5
    await expectVideoNear(video, expectedSeconds)

    await expect(page.locator(".type-timestamp").first()).toContainText("0:05")
  })

  test("dual-player sync smoke keeps panes aligned after left scrub", async ({
    page,
  }) => {
    const compareUrl =
      `/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}/compare?left=${fixture.versionALabel}&right=${fixture.versionBLabel}`
    await page.goto(compareUrl)

    await expect(page.getByText("Sync locked")).toBeVisible()

    const leftVideo = videoInPane(page, "left")
    const rightVideo = videoInPane(page, "right")
    const duration = await waitForVideoReady(page, leftVideo)
    await waitForVideoReady(page, rightVideo)
    expect(duration).toBeGreaterThan(8)

    const expectedSeconds = 5
    await leftVideo.click()
    await page.keyboard.press("l")

    await expectVideoNear(leftVideo, expectedSeconds)
    await expectVideoNear(rightVideo, expectedSeconds)
  })

  test("comment timestamp precision smoke stores the playhead time", async ({
    page,
  }) => {
    const reviewUrl =
      `/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}?version=${fixture.versionBLabel}`
    await page.goto(reviewUrl)

    const video = page.locator("video").first()
    const duration = await waitForVideoReady(page, video)
    expect(duration).toBeGreaterThan(5)

    const targetSeconds = 5
    await video.click()
    await page.keyboard.press("l")
    await expectVideoNear(video, targetSeconds)

    await page.keyboard.press("c")
    await expect(page.getByLabel("Comment body")).toBeVisible()
    await expect(page.getByText(/At 0:05/)).toBeVisible()

    const body = `Timestamp precision smoke ${Date.now()}`
    await page.getByLabel("Comment body").fill(body)
    await page.getByRole("button", { name: "Add comment" }).click()
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("0:05").first()).toBeVisible()

    const { baseUrl } = runtime()
    const session = await apiLogin(baseUrl, E2E_PROOFING.email, E2E_PROOFING.password)
    const commentsRes = await apiFetch(
      baseUrl,
      `/api/comments?versionId=${encodeURIComponent(fixture.versionBId)}`,
      {
        cookies: session.cookies,
        csrfToken: session.csrfToken,
      },
    )
    expect(commentsRes.status).toBe(200)
    const comments = (await commentsRes.json()) as Array<{
      body: string
      timestamp: number
    }>
    const created = comments.find((comment) => comment.body === body)
    expect(created).toBeTruthy()
    expect(Math.abs(created!.timestamp - targetSeconds)).toBeLessThanOrEqual(
      SEEK_TOLERANCE_SEC,
    )
  })
})
