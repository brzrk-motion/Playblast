import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { E2E_ADMIN, E2E_CREATIVE } from "../credentials.js"
import { apiFetch, apiLogin, authHeaders } from "./api.js"

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const sampleVideoPath = path.join(e2eRoot, "fixtures/assets/sample.mp4")

export interface PlaybackFixture {
  projectId: string
  deliverableId: string
  versionAId: string
  versionBId: string
  versionALabel: string
  versionBLabel: string
}

async function uploadVersion(
  baseUrl: string,
  cookies: string[],
  csrfToken: string,
  deliverableId: string,
  versionLabel: string,
): Promise<{ versionId: string; label: string }> {
  const bytes = fs.readFileSync(sampleVideoPath)
  const formData = new FormData()
  formData.append(
    "video",
    new Blob([bytes], { type: "video/mp4" }),
    path.basename(sampleVideoPath),
  )

  const response = await fetch(
    `${baseUrl}/api/deliverables/${deliverableId}/versions/${versionLabel}/upload`,
    {
      method: "POST",
      headers: authHeaders(cookies, csrfToken, false),
      body: formData,
    },
  )

  if (response.status !== 201) {
    throw new Error(`upload ${versionLabel} failed: ${response.status}`)
  }

  const body = (await response.json()) as { versionId: string }
  return { versionId: body.versionId, label: versionLabel }
}

export async function seedPlaybackFixture(baseUrl: string): Promise<PlaybackFixture> {
  const admin = await apiLogin(baseUrl, E2E_ADMIN.email, E2E_ADMIN.password)
  const creative = await apiLogin(baseUrl, E2E_CREATIVE.email, E2E_CREATIVE.password)

  const projectRes = await apiFetch(baseUrl, "/api/projects", {
    method: "POST",
    cookies: admin.cookies,
    csrfToken: admin.csrfToken,
    body: { name: "Playback Smoke Project" },
  })
  if (projectRes.status !== 201) {
    throw new Error(`create project failed: ${projectRes.status}`)
  }
  const project = (await projectRes.json()) as { id: string }

  const deliverableRes = await apiFetch(
    baseUrl,
    `/api/projects/${project.id}/deliverables`,
    {
      method: "POST",
      cookies: admin.cookies,
      csrfToken: admin.csrfToken,
      body: { name: "Playback Smoke Deliverable" },
    },
  )
  if (deliverableRes.status !== 201) {
    throw new Error(`create deliverable failed: ${deliverableRes.status}`)
  }
  const deliverable = (await deliverableRes.json()) as { id: string }

  const versionA = await uploadVersion(
    baseUrl,
    creative.cookies,
    creative.csrfToken,
    deliverable.id,
    "v1",
  )
  const versionB = await uploadVersion(
    baseUrl,
    creative.cookies,
    creative.csrfToken,
    deliverable.id,
    "v2",
  )

  return {
    projectId: project.id,
    deliverableId: deliverable.id,
    versionAId: versionA.versionId,
    versionBId: versionB.versionId,
    versionALabel: versionA.label,
    versionBLabel: versionB.label,
  }
}
