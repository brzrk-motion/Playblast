import type { Project, ProjectSummary } from "@/types/project"

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
