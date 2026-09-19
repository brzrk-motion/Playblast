import { authHeaders } from "./api.js"

export interface TusUploadResponse {
  filename: string
  size: number
  duration: null
  projectId: string
  deliverableId: string
  version: string
  versionId: string
}

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
): Promise<TusUploadResponse> {
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
      ...authHeaders(cookies, csrfToken, false),
    },
  })
  if (createResponse.status !== 201) {
    throw new Error(`tus create ${versionLabel} failed: ${createResponse.status}`)
  }

  const location = createResponse.headers.get("Location")
  if (!location) {
    throw new Error(`tus create ${versionLabel} missing Location header`)
  }

  const patchResponse = await fetch(resolveTusUrl(baseUrl, location), {
    method: "PATCH",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": "0",
      "Content-Type": "application/offset+octet-stream",
      ...authHeaders(cookies, csrfToken, false),
    },
    body: new Uint8Array(bytes),
  })

  if (patchResponse.status !== 200) {
    throw new Error(`tus patch ${versionLabel} failed: ${patchResponse.status}`)
  }

  return (await patchResponse.json()) as TusUploadResponse
}
