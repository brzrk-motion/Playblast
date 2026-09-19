import { expect, type Locator, type Page } from "@playwright/test"

/** Playback assertions tolerate Vidstack seek settling and slider quantization. */
export const SEEK_TOLERANCE_SEC = 0.35

export function videoInPane(page: Page, pane: "left" | "right"): Locator {
  return page
    .locator("div.space-y-3")
    .filter({ has: page.getByText(`${pane} pane`, { exact: true }) })
    .locator("video")
}

export function paneRoot(page: Page, pane: "left" | "right"): Locator {
  return page
    .locator("div.space-y-3")
    .filter({ has: page.getByText(`${pane} pane`, { exact: true }) })
}

export function seekSliderInPane(page: Page, pane: "left" | "right"): Locator {
  return paneRoot(page, pane)
    .getByRole("region")
    .locator(".video-controls")
    .getByRole("slider")
    .first()
}

export async function waitForVideoReady(
  page: Page,
  video?: Locator,
  timeoutMs = 45_000,
): Promise<number> {
  const target = video ?? page.locator("video").first()
  await target.waitFor({ state: "attached", timeout: timeoutMs })

  const handle = await target.elementHandle()
  if (!handle) {
    throw new Error("Video element handle missing")
  }

  const durationHandle = await page.waitForFunction(
    (el) => {
      const node = el as HTMLVideoElement
      return Number.isFinite(node.duration) && node.duration > 0 ? node.duration : null
    },
    handle,
    { timeout: timeoutMs },
  )

  const duration = await durationHandle.jsonValue()
  if (typeof duration !== "number" || duration <= 0) {
    throw new Error("Video duration was not available")
  }

  return duration
}

export async function getVideoCurrentTime(video: Locator): Promise<number> {
  return video.evaluate((el) => (el as HTMLVideoElement).currentTime)
}

export async function waitForVideoTime(
  video: Locator,
  expectedSeconds: number,
  toleranceSec = SEEK_TOLERANCE_SEC,
  timeoutMs = 10_000,
): Promise<number> {
  const started = Date.now()
  let latest = await getVideoCurrentTime(video)

  while (Date.now() - started < timeoutMs) {
    latest = await getVideoCurrentTime(video)
    if (Math.abs(latest - expectedSeconds) <= toleranceSec) {
      return latest
    }
    await video.page().waitForTimeout(100)
  }

  return latest
}

export async function expectVideoNear(
  video: Locator,
  expectedSeconds: number,
  toleranceSec = SEEK_TOLERANCE_SEC,
): Promise<void> {
  const current = await waitForVideoTime(video, expectedSeconds, toleranceSec)
  expect(
    Math.abs(current - expectedSeconds),
    `video currentTime ${current} not within ${toleranceSec}s of ${expectedSeconds}`,
  ).toBeLessThanOrEqual(toleranceSec)
}

export async function seekVideo(video: Locator, seconds: number): Promise<void> {
  await video.evaluate((el, target) => {
    const node = el as HTMLVideoElement
    node.pause()
    node.currentTime = target
  }, seconds)

  await video.evaluate(
    (el, target) =>
      new Promise<void>((resolve) => {
        const node = el as HTMLVideoElement
        const done = () => resolve()
        if (Math.abs(node.currentTime - target) <= 0.05) {
          done()
          return
        }
        node.addEventListener("seeked", done, { once: true })
      }),
    seconds,
  )
}

export async function seekViaSlider(
  slider: Locator,
  fraction: number,
): Promise<void> {
  const box = await slider.boundingBox()
  if (!box) {
    throw new Error("Seek slider is not visible")
  }

  const clamped = Math.min(1, Math.max(0, fraction))
  const x = box.x + box.width * clamped
  const y = box.y + box.height / 2
  await slider.page().mouse.click(x, y)
}
