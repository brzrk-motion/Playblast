import { expect, runtime, sampleVideoPath, storageStateFor, test } from "../fixtures/test.js"
import { apiFetch, apiLogin, cookieHeader } from "../helpers/api.js"
import { E2E_ADMIN, E2E_CREATIVE, E2E_PROOFING } from "../credentials.js"

let projectId = ""
let serviceId = ""
let deliverableId = ""
let versionAId = ""
let versionBId = ""
let versionBLabel = ""
let versionBFilename = ""

test.describe.configure({ mode: "serial" })

test.describe("Admin workflow seed", () => {
  test.use({ storageState: storageStateFor("admin") })

  test("Admin creates client/service/project with budget and dates", async ({ page }) => {
    const { baseUrl } = runtime()
    const session = await apiLogin(baseUrl, E2E_ADMIN.email, E2E_ADMIN.password)

    const clientRes = await apiFetch(baseUrl, "/api/clients", {
      method: "POST",
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      body: { name: "E2E Client Co", email: "client@e2e.fixture" },
    })
    expect(clientRes.status).toBe(201)

    const serviceRes = await apiFetch(baseUrl, "/api/services", {
      method: "POST",
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      body: {
        name: "E2E Motion Service",
        hourEstimate: 10,
        hourlyRate: 150,
        type: "animated",
      },
    })
    expect([200, 201]).toContain(serviceRes.status)
    const service = (await serviceRes.json()) as { id: string }
    serviceId = service.id
    expect(serviceId).toBeTruthy()

    await page.goto("/projects")
    await page.getByRole("button", { name: "New Project" }).first().click()
    await page.locator("#project-name").fill("E2E Review Project")
    await page.locator("#project-start").fill("2026-01-01")
    await page.locator("#project-end").fill("2026-12-31")
    await page.locator("#project-budget").fill("12000")
    await page.getByRole("button", { name: "Create Project" }).click()
    await expect(page.getByRole("link", { name: "E2E Review Project" }).first()).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole("link", { name: "E2E Review Project" }).first().click()
    await page.waitForURL(/\/projects\/[^/]+$/)
    projectId = page.url().match(/\/projects\/([^/?#]+)/)?.[1] ?? ""
    expect(projectId).toBeTruthy()

    const attachService = await apiFetch(baseUrl, `/api/projects/${projectId}/services`, {
      method: "POST",
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      body: { serviceId, quantity: 1 },
    })
    expect(attachService.status).toBe(201)
  })

  test("Admin adds a milestone and task", async ({ page }) => {
    expect(projectId).toBeTruthy()
    await page.goto(`/projects/${projectId}`)
    const milestonesTab = page.getByRole("tab", { name: "Milestones" })
    await expect(milestonesTab).toBeVisible()
    await milestonesTab.click()
    await page.getByPlaceholder("Add a milestone…").fill("E2E Milestone")
    await page.keyboard.press("Enter")
    await expect(page.getByText("E2E Milestone")).toBeVisible()
    await page.getByPlaceholder("Add a task…").fill("E2E Storyboard Review")
    await page.getByRole("button", { name: "Add task" }).click()
    await expect(page.getByText("E2E Storyboard Review")).toBeVisible()
  })

  test("Admin creates deliverable", async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.getByRole("tab", { name: "Deliverables" }).click()
    await page.getByRole("button", { name: "New Deliverable" }).first().click()
    await page.locator("#deliverable-name").fill("Hero Spot")
    await page.getByRole("button", { name: "Create Deliverable" }).click()
    await expect(page.getByText("Hero Spot")).toBeVisible()
    await page.getByRole("link", { name: "Hero Spot" }).first().click()
    await page.waitForURL(/\/deliverables\//)
    deliverableId = page.url().match(/\/deliverables\/([^/?#]+)/)?.[1] ?? ""
    expect(deliverableId).toBeTruthy()
  })
})

test.describe("Creative upload and approval", () => {
  test.use({ storageState: storageStateFor("creative") })

  test("Creative uploads two versions", async ({ page }) => {
    expect(projectId && deliverableId).toBeTruthy()
    await page.goto(`/projects/${projectId}/deliverables/${deliverableId}`)
    await page.getByRole("button", { name: /Upload/ }).first().click()
    await expect(page.getByLabel("Choose a video file to upload")).toBeVisible()
    await page.locator("#version-upload-file").setInputFiles(sampleVideoPath)
    const label = page.locator("#version-label")
    if (await label.isEditable()) {
      await label.fill("v1")
    }
    await page.getByRole("button", { name: "Upload Version" }).click()
    await expect(page.getByText(/Upload complete/i).first()).toBeVisible({
      timeout: 60_000,
    })

    await page.getByRole("button", { name: "Upload another version" }).click()
    await expect(page.getByLabel("Choose a video file to upload")).toBeVisible()
    await page.locator("#version-upload-file").setInputFiles(sampleVideoPath)
    if (await page.locator("#version-label").isEditable()) {
      await page.locator("#version-label").fill("v2")
    }
    await page.getByRole("button", { name: "Upload Version" }).click()
    await expect(page.getByText(/Upload complete/i).first()).toBeVisible({
      timeout: 60_000,
    })

    const { baseUrl } = runtime()
    const session = await apiLogin(baseUrl, E2E_CREATIVE.email, E2E_CREATIVE.password)
    const versions = await apiFetch(baseUrl, `/api/deliverables/${deliverableId}/versions`, {
      cookies: session.cookies,
      csrfToken: session.csrfToken,
    })
    expect(versions.status).toBe(200)
    const list = (await versions.json()) as Array<{ id: string; label: string; filename: string }>
    expect(list.length).toBeGreaterThanOrEqual(2)
    const byLabel = [...list].sort((a, b) => a.label.localeCompare(b.label))
    versionAId = byLabel[0]!.id
    versionBId = byLabel[1]!.id
    versionBLabel = byLabel[1]!.label
    versionBFilename = byLabel[1]!.filename

    const creativeComment = await apiFetch(baseUrl, "/api/comments", {
      method: "POST",
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      body: {
        versionId: versionBId,
        timestamp: 0.05,
        body: "Creative handoff note",
      },
    })
    expect(creativeComment.status).toBe(201)
    const comment = (await creativeComment.json()) as { author: string }
    expect(comment.author).toBe(E2E_CREATIVE.name)
  })

  test("Creative approves a version", async ({ page }) => {
    await page.goto(`/projects/${projectId}/deliverables/${deliverableId}`)
    const approve = page.getByLabel("Approve version")
    await expect(approve).toBeVisible()
    await approve.click()
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByText(/Approved|Status: Approved/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})

test.describe("Proofing review", () => {
  test.use({ storageState: storageStateFor("proofing") })

  test("Proofing comments with annotation payload via API authorship check", async ({
    page,
  }) => {
    const { baseUrl } = runtime()
    const session = await apiLogin(baseUrl, E2E_PROOFING.email, E2E_PROOFING.password)
    const commentRes = await apiFetch(baseUrl, "/api/comments", {
      method: "POST",
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      body: {
        versionId: versionBId,
        timestamp: 0.1,
        body: "Proofing note on timing",
        annotation: {
          timestamp: 0.1,
          viewportWidth: 1280,
          viewportHeight: 720,
          shapes: [
            {
              id: "shape-e2e-1",
              type: "arrow",
              color: "#ff0000",
              strokeWidth: 2,
              points: [0.1, 0.1, 0.4, 0.4],
            },
          ],
        },
      },
    })
    expect(commentRes.status).toBe(201)
    const comment = (await commentRes.json()) as { author: string; body: string }
    expect(comment.body).toContain("Proofing note")
    expect(comment.author).toBe(E2E_PROOFING.name)

    await page.goto(
      `/projects/${projectId}/deliverables/${deliverableId}?version=${versionBId}`,
    )
    await expect(page.getByText("Proofing note on timing").first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText("Creative handoff note").first()).toBeVisible()
  })

  test("Proofing opens compare view", async ({ page }) => {
    await page.goto(
      `/projects/${projectId}/deliverables/${deliverableId}/compare?left=v1&right=v2`,
    )
    await expect(
      page.getByText(/Compare two versions|synced playback/i).first(),
    ).toBeVisible()
    await expect(page.getByText("left pane", { exact: true })).toBeVisible()
    await expect(page.getByText("right pane", { exact: true })).toBeVisible()
    await expect(page.getByRole("region", { name: "Video Player - sample.mp4" })).toHaveCount(2)
    await expect(page.getByRole("heading", { name: "v1", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "v2", exact: true })).toBeVisible()
  })

  test("Proofing can download but cannot approve or upload", async ({ page }) => {
    const { baseUrl } = runtime()
    const session = await apiLogin(baseUrl, E2E_PROOFING.email, E2E_PROOFING.password)

    const download = await apiFetch(baseUrl, `/api/versions/${versionBId}/download`, {
      cookies: session.cookies,
      csrfToken: session.csrfToken,
    })
    expect(download.status).toBe(200)
    expect(download.headers.get("content-disposition")).toContain("attachment")
    expect((await download.arrayBuffer()).byteLength).toBeGreaterThan(0)

    const stream = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${encodeURIComponent(versionBLabel)}/${encodeURIComponent(versionBFilename)}`,
      {
        headers: {
          Cookie: cookieHeader(session.cookies),
          Range: "bytes=0-31",
        },
      },
    )
    expect(stream.status).toBe(206)
    expect(stream.headers.get("content-range")).toMatch(/^bytes 0-31\//)
    expect((await stream.arrayBuffer()).byteLength).toBe(32)

    const deniedMutations = [
      {
        path: `/api/versions/${versionBId}/status`,
        method: "PATCH",
        body: { status: "approved" },
      },
      {
        path: `/api/versions/${versionBId}/label`,
        method: "PATCH",
        body: { label: "proofing-rewrite" },
      },
      {
        path: `/api/projects/${projectId}`,
        method: "PATCH",
        body: { name: "Proofing rewrite" },
      },
      { path: `/api/projects/${projectId}`, method: "DELETE" },
      {
        path: `/api/projects/${projectId}/deliverables`,
        method: "POST",
        body: { name: "Proofing deliverable" },
      },
      {
        path: `/api/projects/${projectId}/milestones`,
        method: "POST",
        body: { name: "Proofing milestone" },
      },
      {
        path: `/api/projects/${projectId}/services`,
        method: "POST",
        body: { serviceId, quantity: 1 },
      },
      {
        path: `/api/deliverables/${deliverableId}/versions/proofing/upload`,
        method: "POST",
      },
    ]

    for (const mutation of deniedMutations) {
      const response = await apiFetch(baseUrl, mutation.path, {
        method: mutation.method,
        cookies: session.cookies,
        csrfToken: session.csrfToken,
        body: mutation.body,
      })
      expect(response.status, `${mutation.method} ${mutation.path}`).toBe(403)
    }

    await page.goto(`/projects/${projectId}/deliverables/${deliverableId}`)
    await expect(page.getByLabel("Approve version")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /Upload/ })).toHaveCount(0)
  })
})

test.describe("Admin destructive confirmation", () => {
  test.use({ storageState: storageStateFor("admin") })

  test("Admin archives with confirmation and deletes the project", async ({ page }) => {
    expect(projectId).toBeTruthy()
    await page.goto(`/projects/${projectId}`)
    const actions = page.getByRole("button", { name: "Actions for E2E Review Project" })
    await expect(actions).toBeVisible({ timeout: 20_000 })
    await actions.click()
    const archiveItem = page.getByRole("menuitem", { name: "Archive project" })
    await expect(archiveItem).toBeVisible()
    await archiveItem.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Archive project" }).click()
    await expect(page.getByText("Archived").first()).toBeVisible({ timeout: 15_000 })

    const { baseUrl } = runtime()
    const session = await apiLogin(baseUrl, E2E_ADMIN.email, E2E_ADMIN.password)
    const remove = await apiFetch(baseUrl, `/api/projects/${projectId}`, {
      method: "DELETE",
      cookies: session.cookies,
      csrfToken: session.csrfToken,
    })
    expect(remove.status).toBe(204)
    const missing = await apiFetch(baseUrl, `/api/projects/${projectId}`, {
      cookies: session.cookies,
      csrfToken: session.csrfToken,
    })
    expect(missing.status).toBe(404)
  })
})
