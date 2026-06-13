import type { FrameAnnotation } from "@/types/annotation"
import type { Client, ClientWithProjects, CreateClientInput, UpdateClientInput } from "@/types/client"
import type { Comment } from "@/types/comment"
import type { Deliverable,
  DeliverableStatus,
  DeliverableSummary,
} from "@/types/deliverable"
import type {
  ContactLog,
  CreateContactLogBody,
} from "@/types/contact-log"
import type { CreateLeadInput, Lead, LeadWithContactLog, UpdateLeadInput } from "@/types/lead"
import type { Milestone } from "@/types/milestone"
import type {
  Project,
  ProjectBudget,
  ProjectStatus,
  ProjectSummary,
} from "@/types/project"
import type { UploadProgress, UploadResponse } from "@/types/upload"
import type { Version, VersionStatus } from "@/types/version"

export function getVideoUrl(
  projectId: string,
  deliverableId: string,
  version: string,
  filename: string,
): string {
  const encodedFilename = filename
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `/video/${encodeURIComponent(projectId)}/${encodeURIComponent(deliverableId)}/${encodeURIComponent(version)}/${encodedFilename}`
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

async function expectOk(response: Response): Promise<void> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(humanizeHttpError(response.status, body?.error))
  }
}

// --- Projects ---------------------------------------------------------------

export async function listProjects(): Promise<ProjectSummary[]> {
  const response = await fetch("/api/projects")
  return parseJsonResponse<ProjectSummary[]>(response)
}

export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`)
  return parseJsonResponse<Project>(response)
}

export interface CreateProjectInput {
  name: string
  id?: string
  status?: ProjectStatus
  client?: string
  description?: string
  startDate?: string
  endDate?: string
  budget?: ProjectBudget
}

export async function createProject(body: CreateProjectInput): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<Project>(response)
}

export interface UpdateProjectInput {
  name?: string
  status?: ProjectStatus
  client?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  budget?: ProjectBudget | null
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJsonResponse<Project>(response)
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  await expectOk(response)
}

// --- Deliverables -----------------------------------------------------------

export async function listDeliverables(
  projectId: string,
): Promise<DeliverableSummary[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/deliverables`,
  )
  return parseJsonResponse<DeliverableSummary[]>(response)
}

export async function getDeliverable(
  deliverableId: string,
): Promise<Deliverable> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}`,
  )
  return parseJsonResponse<Deliverable>(response)
}

export async function createDeliverable(
  projectId: string,
  input: { name: string; description?: string; dueDate?: string; status?: DeliverableStatus },
): Promise<Deliverable> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/deliverables`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
  return parseJsonResponse<Deliverable>(response)
}

export async function updateDeliverable(
  deliverableId: string,
  input: {
    name?: string
    description?: string | null
    status?: DeliverableStatus
    dueDate?: string | null
  },
): Promise<Deliverable> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
  return parseJsonResponse<Deliverable>(response)
}

export async function updateDeliverableStatus(
  deliverableId: string,
  status: DeliverableStatus,
): Promise<Deliverable> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  )
  return parseJsonResponse<Deliverable>(response)
}

export async function deleteDeliverable(deliverableId: string): Promise<void> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}`,
    { method: "DELETE" },
  )
  await expectOk(response)
}

// --- Milestones -------------------------------------------------------------

export async function listMilestones(projectId: string): Promise<Milestone[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/milestones`,
  )
  return parseJsonResponse<Milestone[]>(response)
}

export async function createMilestone(
  projectId: string,
  input: { name: string; dueDate?: string; done?: boolean },
): Promise<Milestone> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/milestones`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
  return parseJsonResponse<Milestone>(response)
}

export async function updateMilestone(
  milestoneId: string,
  input: { name?: string; dueDate?: string | null; done?: boolean },
): Promise<Milestone> {
  const response = await fetch(
    `/api/milestones/${encodeURIComponent(milestoneId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )
  return parseJsonResponse<Milestone>(response)
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  const response = await fetch(
    `/api/milestones/${encodeURIComponent(milestoneId)}`,
    { method: "DELETE" },
  )
  await expectOk(response)
}

// --- Versions ---------------------------------------------------------------

export async function listVersions(deliverableId: string): Promise<Version[]> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/versions`,
  )
  return parseJsonResponse<Version[]>(response)
}

export async function listComments(
  deliverableId: string,
  versionLabel: string,
): Promise<Comment[]> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/versions/${encodeURIComponent(versionLabel)}/comments`,
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

export async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(
    `/api/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" },
  )
  await expectOk(response)
}

export async function createCommentForVersion(
  deliverableId: string,
  versionLabel: string,
  input: {
    timestamp: number
    body: string
    author: string
    annotation?: FrameAnnotation
  },
): Promise<Comment> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/versions/${encodeURIComponent(versionLabel)}/comments`,
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
  deliverableId: string,
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
      `/api/deliverables/${encodeURIComponent(deliverableId)}/versions/${encodeURIComponent(label)}/upload`,
    )
    xhr.send(formData)
  })
}

// --- Leads ------------------------------------------------------------------

export interface ListLeadsFilters {
  status?: Lead["status"]
  replied?: boolean
}

export async function listLeads(
  filters: ListLeadsFilters = {},
): Promise<Lead[]> {
  const params = new URLSearchParams()
  if (filters.status) {
    params.set("status", filters.status)
  }
  if (filters.replied !== undefined) {
    params.set("replied", String(filters.replied))
  }

  const query = params.toString()
  const response = await fetch(`/api/leads${query ? `?${query}` : ""}`)
  return parseJsonResponse<Lead[]>(response)
}

export async function getLead(id: string): Promise<LeadWithContactLog> {
  const response = await fetch(`/api/leads/${encodeURIComponent(id)}`)
  return parseJsonResponse<LeadWithContactLog>(response)
}

export async function listContactLog(leadId: string): Promise<ContactLog[]> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/log`,
  )
  return parseJsonResponse<ContactLog[]>(response)
}

export async function createContactLog(
  leadId: string,
  body: CreateContactLogBody,
): Promise<ContactLog> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/log`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
  return parseJsonResponse<ContactLog>(response)
}

export async function deleteContactLog(
  leadId: string,
  logId: string,
): Promise<void> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/log/${encodeURIComponent(logId)}`,
    { method: "DELETE" },
  )
  await expectOk(response)
}

export async function createLead(body: CreateLeadInput): Promise<Lead> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<Lead>(response)
}

export async function updateLead(
  id: string,
  body: UpdateLeadInput,
): Promise<Lead> {
  const response = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<Lead>(response)
}

export async function deleteLead(id: string): Promise<void> {
  const response = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  await expectOk(response)
}

export interface ConvertLeadInput {
  notes?: string
}

export async function convertLeadToClient(
  id: string,
  body?: ConvertLeadInput,
): Promise<Client> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(id)}/convert`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  )
  return parseJsonResponse<Client>(response)
}

// --- Clients ----------------------------------------------------------------

export async function listClients(): Promise<Client[]> {
  const response = await fetch("/api/clients")
  return parseJsonResponse<Client[]>(response)
}

export async function getClient(id: string): Promise<ClientWithProjects> {
  const response = await fetch(`/api/clients/${encodeURIComponent(id)}`)
  return parseJsonResponse<ClientWithProjects>(response)
}

export async function createClient(body: CreateClientInput): Promise<Client> {
  const response = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<Client>(response)
}

export async function updateClient(
  id: string,
  body: UpdateClientInput,
): Promise<Client> {
  const response = await fetch(`/api/clients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<Client>(response)
}

export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`/api/clients/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  await expectOk(response)
}
