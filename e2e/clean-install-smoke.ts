/**
 * T7 clean-install smoke: fresh DB → setup → login → project → upload stub → comment.
 * SMTP is verified post-setup via Team (/api/smtp), not the first-run wizard.
 */
import { authHeaders, collectSetCookies } from "./helpers/api.js"

const baseUrl = process.env.PLAYBLAST_BASE_URL ?? "http://127.0.0.1:3099"

const admin = {
  name: "Clean Install Admin",
  email: "admin@clean-install.fixture",
  password: "clean-install-admin-password-99",
  studioName: "Clean Install Studio",
}

async function expectJson<T>(
  label: string,
  response: Response,
  expectedStatus: number,
): Promise<T> {
  if (response.status !== expectedStatus) {
    const body = await response.text().catch(() => "")
    throw new Error(`${label} returned ${response.status}: ${body.slice(0, 200)}`)
  }
  return (await response.json()) as T
}

async function main() {
  const health = await fetch(`${baseUrl}/health`)
  const healthBody = await expectJson<{ status: string; database?: string }>(
    "GET /health",
    health,
    200,
  )
  if (healthBody.status !== "ok" || healthBody.database !== "ok") {
    throw new Error(`GET /health unexpected body: ${JSON.stringify(healthBody)}`)
  }

  const setupStatus = await fetch(`${baseUrl}/api/setup/status`)
  const setupPending = await expectJson<{
    status: string
    smtpConfiguredFromEnv: boolean
  }>("GET /api/setup/status (pending)", setupStatus, 200)
  if (setupPending.status !== "pending") {
    throw new Error(`expected setup status pending, got ${setupPending.status}`)
  }

  const bootstrapResponse = await fetch(`${baseUrl}/api/setup/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: admin.name,
      email: admin.email,
      password: admin.password,
      confirmPassword: admin.password,
    }),
  })
  const bootstrap = await expectJson<{ csrfToken: string }>(
    "POST /api/setup/admin",
    bootstrapResponse,
    201,
  )
  const cookies = collectSetCookies(bootstrapResponse)
  const csrfToken = bootstrap.csrfToken

  await fetch(`${baseUrl}/api/studio`, {
    method: "PATCH",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({ name: admin.studioName }),
  })

  const completeResponse = await fetch(`${baseUrl}/api/setup/complete`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
  })
  if (completeResponse.status !== 200) {
    throw new Error(`POST /api/setup/complete returned ${completeResponse.status}`)
  }

  const setupComplete = await fetch(`${baseUrl}/api/setup/status`)
  const setupDone = await expectJson<{ status: string }>(
    "GET /api/setup/status (complete)",
    setupComplete,
    200,
  )
  if (setupDone.status !== "complete") {
    throw new Error(`expected setup status complete, got ${setupDone.status}`)
  }

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  })
  const login = await expectJson<{ csrfToken: string }>("POST /api/auth/login", loginResponse, 200)
  const sessionCookies = collectSetCookies(loginResponse)
  const sessionCsrf = login.csrfToken

  const smtpResponse = await fetch(`${baseUrl}/api/smtp`, {
    headers: authHeaders(sessionCookies, sessionCsrf, false),
  })
  const smtp = await expectJson<{
    configured: boolean
    smtpConfiguredFromEnv: boolean
  }>("GET /api/smtp (Team settings)", smtpResponse, 200)
  if (smtp.configured) {
    throw new Error("fresh clean install should not have UI SMTP configured yet")
  }
  if (smtp.smtpConfiguredFromEnv) {
    throw new Error("clean-install smoke expects UI-configurable SMTP (no env override)")
  }

  const projectResponse = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: authHeaders(sessionCookies, sessionCsrf),
    body: JSON.stringify({
      id: "clean-install-smoke",
      name: "Clean Install Smoke Project",
      status: "active",
    }),
  })
  const project = await expectJson<{ id: string }>("POST /api/projects", projectResponse, 201)

  const deliverableResponse = await fetch(
    `${baseUrl}/api/projects/${project.id}/deliverables`,
    {
      method: "POST",
      headers: authHeaders(sessionCookies, sessionCsrf),
      body: JSON.stringify({ name: "Hero Cut" }),
    },
  )
  const deliverable = await expectJson<{ id: string }>(
    "POST /api/projects/:id/deliverables",
    deliverableResponse,
    201,
  )

  const versionLabel = "v1"
  const videoFilename = "clean-install-smoke.mp4"
  const videoBytes = Buffer.alloc(512, 0x42)
  const formData = new FormData()
  formData.append(
    "video",
    new Blob([videoBytes], { type: "video/mp4" }),
    videoFilename,
  )

  const uploadResponse = await fetch(
    `${baseUrl}/api/deliverables/${deliverable.id}/versions/${versionLabel}/upload`,
    {
      method: "POST",
      headers: authHeaders(sessionCookies, sessionCsrf, false),
      body: formData,
    },
  )
  const upload = await expectJson<{ versionId: string }>(
    "POST upload stub video",
    uploadResponse,
    201,
  )

  const commentResponse = await fetch(`${baseUrl}/api/comments`, {
    method: "POST",
    headers: authHeaders(sessionCookies, sessionCsrf),
    body: JSON.stringify({
      versionId: upload.versionId,
      timestamp: 1.5,
      body: "Clean install smoke comment",
    }),
  })
  await expectJson<{ id: string }>("POST /api/comments", commentResponse, 201)

  console.log("Clean install smoke passed.")
  console.log(`  setup: pending → complete`)
  console.log(`  login: ${admin.email}`)
  console.log(`  project: ${project.id}`)
  console.log(`  upload: ${versionLabel} (${videoFilename})`)
  console.log(`  smtp: Team settings route reachable (not configured)`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Clean install smoke failed")
  process.exit(1)
})
