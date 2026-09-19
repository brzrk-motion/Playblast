import assert from "node:assert/strict"
import type { UploadResponse } from "../types/upload.js"
import { cookieHeader } from "./auth-helpers.js"

function encodeTusMetadata(metadata: Record<string, string>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key} ${Buffer.from(value, "utf8").toString("base64")}`)
    .join(",")
}

function resolveTusUrl(baseUrl: string, location: string): string {
  if (location.startsWith("http://") || location.startsWith("https://")) {
    return location
  }

  return new URL(location, baseUrl).toString()
}

export async function tusUploadVersion(
  baseUrl: string,
  cookies: string[],
  csrfToken: string,
  deliverableId: string,
  versionLabel: string,
  filename: string,
  bytes: Buffer,
): Promise<UploadResponse> {
  const metadata = {
    deliverableId,
    version: versionLabel,
    filename,
    filetype: "video/mp4",
  }

  const createResponse = await fetch(`${baseUrl}/api/uploads/tus`, {
    method: "POST",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(bytes.length),
      "Upload-Metadata": encodeTusMetadata(metadata),
      Cookie: cookieHeader(cookies),
      "X-CSRF-Token": csrfToken,
    },
  })
  assert.equal(createResponse.status, 201, await createResponse.text())

  const location = createResponse.headers.get("Location")
  assert.ok(location, "tus create response missing Location header")

  const patchResponse = await fetch(resolveTusUrl(baseUrl, location), {
    method: "PATCH",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": "0",
      "Content-Type": "application/offset+octet-stream",
      Cookie: cookieHeader(cookies),
      "X-CSRF-Token": csrfToken,
    },
    body: new Uint8Array(bytes),
  })

  const patchBody = await patchResponse.text()
  assert.equal(patchResponse.status, 200, patchBody)
  return JSON.parse(patchBody) as UploadResponse
}
