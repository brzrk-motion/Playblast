import type { Comment } from "@/types/comment"
import type { Project, ProjectSummary } from "@/types/project"
import type { UploadProgress, UploadResponse } from "@/types/upload"
import type { Version } from "@/types/version"

export function getVideoUrl(
  projectId: string,
  version: string,
  filename: string,
): string {
  const encodedFilename = filename
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `/video/${encodeURIComponent(projectId)}/${encodeURIComponent(version)}/${encodedFilename}`
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const response = await fetch("/api/projects")
  return parseJsonResponse<ProjectSummary[]>(response)
}

export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`)
  return parseJsonResponse<Project>(response)
}

export async function createProject(body: {
  name: string
  id?: string
}): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<Project>(response)
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
  }
}

export async function listVersions(projectId: string): Promise<Version[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/versions`,
  )
  return parseJsonResponse<Version[]>(response)
}

export async function listComments(
  projectId: string,
  versionLabel: string,
): Promise<Comment[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionLabel)}/comments`,
  )
  return parseJsonResponse<Comment[]>(response)
}

export function uploadVersion(
  projectId: string,
  label: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("video", file)

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        })
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadResponse)
        return
      }

      try {
        const body = JSON.parse(xhr.responseText) as { error?: string }
        reject(new Error(body.error ?? `Upload failed with status ${xhr.status}`))
      } catch {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"))
    })

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"))
    })

    xhr.open(
      "POST",
      `/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(label)}/upload`,
    )
    xhr.send(formData)
  })
}
