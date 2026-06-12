import type { FrameAnnotation } from "@/types/annotation"
import type { Comment } from "@/types/comment"
import type { Project, ProjectSummary } from "@/types/project"
import type { UploadProgress, UploadResponse } from "@/types/upload"
import type { Version, VersionStatus } from "@/types/version"

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

function humanizeHttpError(status: number, serverMessage?: string): string {
  if (serverMessage) {
    return serverMessage
  }

  switch (status) {
    case 400:
      return "Invalid request."
    case 401:
      return "Sign in required."
    case 403:
      return "You don't have permission to do that."
    case 404:
      return "Not found."
    case 409:
      return "This action conflicts with existing data."
    case 413:
      return "File is too large."
    case 500:
      return "Something went wrong on our end."
    default:
      return "Something went wrong. Please try again."
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(humanizeHttpError(response.status, body?.error))
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
    throw new Error(humanizeHttpError(response.status, body?.error))
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(
    `/api/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" },
  )

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(humanizeHttpError(response.status, body?.error))
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

export async function listCommentsByVersionId(
  versionId: string,
): Promise<Comment[]> {
  const response = await fetch(
    `/api/comments?versionId=${encodeURIComponent(versionId)}`,
  )
  return parseJsonResponse<Comment[]>(response)
}

export async function createComment(input: {
  versionId: string
  timestamp: number
  body: string
  author: string
  annotation?: FrameAnnotation
}): Promise<Comment> {
  const response = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJsonResponse<Comment>(response)
}

export async function resolveComment(
  commentId: string,
  resolved: boolean,
): Promise<Comment> {
  const response = await fetch(
    `/api/comments/${encodeURIComponent(commentId)}/resolve`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    },
  )
  return parseJsonResponse<Comment>(response)
}

export async function createCommentForVersion(
  projectId: string,
  versionLabel: string,
  input: {
    timestamp: number
    body: string
    author: string
    annotation?: FrameAnnotation
  },
): Promise<Comment> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionLabel)}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
  return parseJsonResponse<Comment>(response)
}

export async function updateVersionLabel(
  versionId: string,
  label: string,
): Promise<Version> {
  const response = await fetch(
    `/api/versions/${encodeURIComponent(versionId)}/label`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    },
  )
  return parseJsonResponse<Version>(response)
}

export async function updateVersionStatus(
  versionId: string,
  status: VersionStatus,
): Promise<Version> {
  const response = await fetch(
    `/api/versions/${encodeURIComponent(versionId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  )
  return parseJsonResponse<Version>(response)
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
        reject(new Error(humanizeHttpError(xhr.status, body.error)))
      } catch {
        reject(new Error(humanizeHttpError(xhr.status)))
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
