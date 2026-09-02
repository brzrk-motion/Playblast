import type { FrameAnnotation } from "@/types/annotation"
import type { Client, ClientListItem, ClientWithProjects, CreateClientInput, UpdateClientInput } from "@/types/client"
import type { Comment } from "@/types/comment"
import type { Deliverable,
  DeliverableStatus,
  DeliverableSummary,
} from "@/types/deliverable"
import type {
  ContactLog,
  CreateContactLogBody,
} from "@/types/contact-log"
import type {
  CreateInvoicePaymentInput,
  CreateInvoicePaymentResponse,
  InvoiceSummary,
  InvoiceWithPayments,
} from "@/types/invoice"
import type { CreateLeadInput, Lead, LeadWithContactLog, UpdateLeadInput } from "@/types/lead"
import type { Milestone } from "@/types/milestone"
import type { Task } from "@/types/task"
import type { TimeLog } from "@/types/time-log"
import type { TimesheetWeek } from "@/types/timesheet"
import type { ProjectHoursSummary } from "@/types/hours-summary"
import type {
  Project,
  ProjectBudget,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
} from "@/types/project"
import type {
  AddProjectServiceInput,
  ProjectServiceWithDetails,
  UpdateProjectServiceInput,
} from "@/types/project-service"
import type {
  CreateServiceInput,
  Service,
  ServiceProjectUsage,
  UpdateServiceInput,
} from "@/types/service"
import type { UploadProgress, UploadResponse } from "@/types/upload"
import type { Version, VersionStatus } from "@/types/version"
import { isApiErrorEnvelope } from "@playblast/shared"
import {
  ApiError,
  buildApiHeaders,
  expectApiOk,
  parseApiResponse,
} from "@/lib/api-http"

export { ApiError, isApiError, redirectOnSessionExpired, getForbiddenMessage } from "@/lib/api-http"

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

export function getVersionDownloadUrl(versionId: string): string {
  return `/api/versions/${encodeURIComponent(versionId)}/download`
}

export function downloadVersion(versionId: string): void {
  const link = document.createElement("a")
  link.href = getVersionDownloadUrl(versionId)
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// --- Projects ---------------------------------------------------------------

export async function listProjects(options?: {
  clientId?: string
  archived?: boolean
  includeArchived?: boolean
}): Promise<ProjectSummary[]> {
  const params = new URLSearchParams()
  if (options?.clientId) {
    params.set("clientId", options.clientId)
  }
  if (options?.archived) {
    params.set("archived", "true")
  }
  if (options?.includeArchived) {
    params.set("includeArchived", "true")
  }
  const query = params.toString()
  const response = await fetch(
    `/api/projects${query ? `?${query}` : ""}`,
  )
  return parseApiResponse<ProjectSummary[]>(response)
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`)
  return parseApiResponse<ProjectDetail>(response)
}

export interface CreateProjectInput {
  name: string
  id?: string
  status?: ProjectStatus
  client?: string
  clientId?: string
  description?: string
  startDate?: string
  endDate?: string
  budget?: ProjectBudget
}

export async function createProject(body: CreateProjectInput): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(body),
  })
  return parseApiResponse<Project>(response)
}

export interface UpdateProjectInput {
  name?: string
  status?: ProjectStatus
  client?: string | null
  clientId?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  budget?: ProjectBudget | null
  notes?: string | null
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(input),
  })
  return parseApiResponse<Project>(response)
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  await expectApiOk(response)
}

export async function archiveProject(id: string): Promise<Project> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/archive`,
    { method: "POST", headers: buildApiHeaders(false), credentials: "include" },
  )
  return parseApiResponse<Project>(response)
}

export async function unarchiveProject(id: string): Promise<Project> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/unarchive`,
    { method: "POST", headers: buildApiHeaders(false), credentials: "include" },
  )
  return parseApiResponse<Project>(response)
}

export async function duplicateProject(id: string): Promise<Project> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/duplicate`,
    { method: "POST", headers: buildApiHeaders(false), credentials: "include" },
  )
  return parseApiResponse<Project>(response)
}

// --- Deliverables -----------------------------------------------------------

export async function listDeliverables(
  projectId: string,
): Promise<DeliverableSummary[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/deliverables`,
  )
  return parseApiResponse<DeliverableSummary[]>(response)
}

export async function getDeliverable(
  deliverableId: string,
): Promise<Deliverable> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}`,
  )
  return parseApiResponse<Deliverable>(response)
}

export async function createDeliverable(
  projectId: string,
  input: { name: string; description?: string; dueDate?: string; status?: DeliverableStatus },
): Promise<Deliverable> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/deliverables`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<Deliverable>(response)
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
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<Deliverable>(response)
}

export async function updateDeliverableStatus(
  deliverableId: string,
  status: DeliverableStatus,
): Promise<Deliverable> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/status`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify({ status }),
    },
  )
  return parseApiResponse<Deliverable>(response)
}

export async function deleteDeliverable(deliverableId: string): Promise<void> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}`,
    { method: "DELETE", headers: buildApiHeaders(false), credentials: "include" },
  )
  await expectApiOk(response)
}

// --- Milestones -------------------------------------------------------------

export async function listMilestones(projectId: string): Promise<Milestone[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/milestones`,
  )
  return parseApiResponse<Milestone[]>(response)
}

export async function createMilestone(
  projectId: string,
  input: { name: string; dueDate?: string; done?: boolean },
): Promise<Milestone> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/milestones`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<Milestone>(response)
}

export async function updateMilestone(
  milestoneId: string,
  input: { name?: string; dueDate?: string | null; done?: boolean },
): Promise<Milestone> {
  const response = await fetch(
    `/api/milestones/${encodeURIComponent(milestoneId)}`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<Milestone>(response)
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  const response = await fetch(
    `/api/milestones/${encodeURIComponent(milestoneId)}`,
    { method: "DELETE", headers: buildApiHeaders(false), credentials: "include" },
  )
  await expectApiOk(response)
}

// --- Tasks ------------------------------------------------------------------

export async function listProjectTasks(projectId: string): Promise<Task[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/tasks`,
  )
  return parseApiResponse<Task[]>(response)
}

export async function createTask(
  milestoneId: string,
  input: { name: string; done?: boolean },
): Promise<Task> {
  const response = await fetch(
    `/api/milestones/${encodeURIComponent(milestoneId)}/tasks`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<Task>(response)
}

export async function updateTask(
  taskId: string,
  input: { name?: string; done?: boolean },
): Promise<Task> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(input),
  })
  return parseApiResponse<Task>(response)
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  })
  await expectApiOk(response)
}

// --- Time logs --------------------------------------------------------------

export async function listTimeLogs(taskId: string): Promise<TimeLog[]> {
  const response = await fetch(
    `/api/tasks/${encodeURIComponent(taskId)}/time-logs`,
  )
  return parseApiResponse<TimeLog[]>(response)
}

export async function createTimeLog(
  taskId: string,
  input: { durationHours: number; loggedAt?: string; notes?: string },
): Promise<TimeLog> {
  const response = await fetch(
    `/api/tasks/${encodeURIComponent(taskId)}/time-logs`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<TimeLog>(response)
}

export async function deleteTimeLog(timeLogId: string): Promise<void> {
  const response = await fetch(
    `/api/time-logs/${encodeURIComponent(timeLogId)}`,
    { method: "DELETE", headers: buildApiHeaders(false), credentials: "include" },
  )
  await expectApiOk(response)
}

export async function updateTimeLog(
  timeLogId: string,
  input: {
    durationHours?: number
    loggedAt?: string
    notes?: string | null
  },
): Promise<TimeLog> {
  const response = await fetch(
    `/api/time-logs/${encodeURIComponent(timeLogId)}`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<TimeLog>(response)
}

export async function getWeeklyTimesheet(
  weekStart?: string,
): Promise<TimesheetWeek> {
  const query = weekStart
    ? `?weekStart=${encodeURIComponent(weekStart)}`
    : ""
  const response = await fetch(`/api/timesheet${query}`)
  return parseApiResponse<TimesheetWeek>(response)
}

export async function getProjectHoursSummary(
  projectId: string,
): Promise<ProjectHoursSummary> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/hours-summary`,
  )
  return parseApiResponse<ProjectHoursSummary>(response)
}

// --- Versions ---------------------------------------------------------------

export async function listVersions(deliverableId: string): Promise<Version[]> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/versions`,
  )
  return parseApiResponse<Version[]>(response)
}

export async function listComments(
  deliverableId: string,
  versionLabel: string,
): Promise<Comment[]> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/versions/${encodeURIComponent(versionLabel)}/comments`,
  )
  return parseApiResponse<Comment[]>(response)
}

export async function listCommentsByVersionId(
  versionId: string,
): Promise<Comment[]> {
  const response = await fetch(
    `/api/comments?versionId=${encodeURIComponent(versionId)}`,
  )
  return parseApiResponse<Comment[]>(response)
}

export async function createComment(input: {
  versionId: string
  timestamp: number
  body: string
  annotation?: FrameAnnotation
}): Promise<Comment> {
  const { versionId, timestamp, body, annotation } = input
  const response = await fetch("/api/comments", {
    method: "POST",
    headers: buildApiHeaders(),
    credentials: "include",
    body: JSON.stringify({ versionId, timestamp, body, annotation }),
  })
  return parseApiResponse<Comment>(response)
}

export async function resolveComment(
  commentId: string,
  resolved: boolean,
): Promise<Comment> {
  const response = await fetch(
    `/api/comments/${encodeURIComponent(commentId)}/resolve`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify({ resolved }),
    },
  )
  return parseApiResponse<Comment>(response)
}

export async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(
    `/api/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      headers: buildApiHeaders(false),
      credentials: "include",
    },
  )
  await expectApiOk(response)
}

export async function createCommentForVersion(
  deliverableId: string,
  versionLabel: string,
  input: {
    timestamp: number
    body: string
    annotation?: FrameAnnotation
  },
): Promise<Comment> {
  const response = await fetch(
    `/api/deliverables/${encodeURIComponent(deliverableId)}/versions/${encodeURIComponent(versionLabel)}/comments`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<Comment>(response)
}

export async function updateVersionLabel(
  versionId: string,
  label: string,
): Promise<Version> {
  const response = await fetch(
    `/api/versions/${encodeURIComponent(versionId)}/label`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify({ label }),
    },
  )
  return parseApiResponse<Version>(response)
}

export async function updateVersionStatus(
  versionId: string,
  status: VersionStatus,
): Promise<Version> {
  const response = await fetch(
    `/api/versions/${encodeURIComponent(versionId)}/status`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify({ status }),
    },
  )
  return parseApiResponse<Version>(response)
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
        const body = JSON.parse(xhr.responseText) as unknown
        if (isApiErrorEnvelope(body)) {
          reject(new ApiError(xhr.status, body))
          return
        }

        const fallback = (body as { error?: string } | null)?.error
        reject(new Error(fallback ?? "Upload failed."))
      } catch {
        reject(new Error("Upload failed."))
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
    xhr.withCredentials = true
    const headers = buildApiHeaders(false) as Record<string, string>
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
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
  return parseApiResponse<Lead[]>(response)
}

export async function getLead(id: string): Promise<LeadWithContactLog> {
  const response = await fetch(`/api/leads/${encodeURIComponent(id)}`)
  return parseApiResponse<LeadWithContactLog>(response)
}

export async function listContactLog(leadId: string): Promise<ContactLog[]> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/log`,
  )
  return parseApiResponse<ContactLog[]>(response)
}

export async function createContactLog(
  leadId: string,
  body: CreateContactLogBody,
): Promise<ContactLog> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/log`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(body),
    },
  )
  return parseApiResponse<ContactLog>(response)
}

export async function deleteContactLog(
  leadId: string,
  logId: string,
): Promise<void> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/log/${encodeURIComponent(logId)}`,
    { method: "DELETE", headers: buildApiHeaders(false), credentials: "include" },
  )
  await expectApiOk(response)
}

export async function createLead(body: CreateLeadInput): Promise<Lead> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(body),
  })
  return parseApiResponse<Lead>(response)
}

export async function updateLead(
  id: string,
  body: UpdateLeadInput,
): Promise<Lead> {
  const response = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(body),
  })
  return parseApiResponse<Lead>(response)
}

export async function deleteLead(id: string): Promise<void> {
  const response = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  await expectApiOk(response)
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
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(body ?? {}),
    },
  )
  return parseApiResponse<Client>(response)
}

// --- Clients ----------------------------------------------------------------

export async function listClients(): Promise<ClientListItem[]> {
  const response = await fetch("/api/clients")
  return parseApiResponse<ClientListItem[]>(response)
}

export async function getClient(id: string): Promise<ClientWithProjects> {
  const response = await fetch(`/api/clients/${encodeURIComponent(id)}`)
  return parseApiResponse<ClientWithProjects>(response)
}

export async function createClient(body: CreateClientInput): Promise<Client> {
  const response = await fetch("/api/clients", {
    method: "POST",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(body),
  })
  return parseApiResponse<Client>(response)
}

export async function updateClient(
  id: string,
  body: UpdateClientInput,
): Promise<Client> {
  const response = await fetch(`/api/clients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(body),
  })
  return parseApiResponse<Client>(response)
}

export async function updateRetainerHours(
  id: string,
  hoursLogged: number,
): Promise<ClientWithProjects> {
  const response = await fetch(
    `/api/clients/${encodeURIComponent(id)}/retainer-hours`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify({ hoursLogged }),
    },
  )
  return parseApiResponse<ClientWithProjects>(response)
}

export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`/api/clients/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  await expectApiOk(response)
}

export async function revertClientToLead(id: string): Promise<Lead> {
  const response = await fetch(
    `/api/clients/${encodeURIComponent(id)}/revert-to-lead`,
    { method: "POST", headers: buildApiHeaders(false), credentials: "include" },
  )
  return parseApiResponse<Lead>(response)
}

// --- Services ---------------------------------------------------------------

export async function listServices(): Promise<Service[]> {
  const response = await fetch("/api/services")
  return parseApiResponse<Service[]>(response)
}

export async function createService(
  body: CreateServiceInput,
): Promise<Service> {
  const response = await fetch("/api/services", {
    method: "POST",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(body),
  })
  return parseApiResponse<Service>(response)
}

export async function updateService(
  id: string,
  body: UpdateServiceInput,
): Promise<Service> {
  const response = await fetch(`/api/services/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: buildApiHeaders(), credentials: "include",
    body: JSON.stringify(body),
  })
  return parseApiResponse<Service>(response)
}

export async function deleteService(id: string): Promise<void> {
  const response = await fetch(`/api/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  await expectApiOk(response)
}

export async function getServiceProjectUsage(
  id: string,
): Promise<ServiceProjectUsage> {
  const response = await fetch(
    `/api/services/${encodeURIComponent(id)}/usage`,
  )
  return parseApiResponse<ServiceProjectUsage>(response)
}

// --- Project services -------------------------------------------------------

export async function listProjectServices(
  projectId: string,
): Promise<ProjectServiceWithDetails[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/services`,
  )
  return parseApiResponse<ProjectServiceWithDetails[]>(response)
}

export async function addProjectService(
  projectId: string,
  input: AddProjectServiceInput,
): Promise<ProjectServiceWithDetails> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/services`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<ProjectServiceWithDetails>(response)
}

export async function removeProjectService(
  projectId: string,
  serviceId: string,
): Promise<void> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}`,
    { method: "DELETE", headers: buildApiHeaders(false), credentials: "include" },
  )
  await expectApiOk(response)
}

export async function updateProjectService(
  projectId: string,
  serviceId: string,
  input: UpdateProjectServiceInput,
): Promise<ProjectServiceWithDetails> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(serviceId)}`,
    {
      method: "PATCH",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(input),
    },
  )
  return parseApiResponse<ProjectServiceWithDetails>(response)
}

// --- Invoices ---------------------------------------------------------------

export async function listProjectInvoices(
  projectId: string,
): Promise<InvoiceSummary[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/invoices`,
  )
  return parseApiResponse<InvoiceSummary[]>(response)
}

export async function createInvoice(projectId: string): Promise<InvoiceSummary> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/invoices`,
    { method: "POST", headers: buildApiHeaders(false), credentials: "include" },
  )
  return parseApiResponse<InvoiceSummary>(response)
}

export async function getInvoice(id: string): Promise<InvoiceWithPayments> {
  const response = await fetch(`/api/invoices/${encodeURIComponent(id)}`)
  return parseApiResponse<InvoiceWithPayments>(response)
}

export async function createInvoicePayment(
  invoiceId: string,
  body: CreateInvoicePaymentInput,
): Promise<CreateInvoicePaymentResponse> {
  const response = await fetch(
    `/api/invoices/${encodeURIComponent(invoiceId)}/payments`,
    {
      method: "POST",
      headers: buildApiHeaders(), credentials: "include",
      body: JSON.stringify(body),
    },
  )
  return parseApiResponse<CreateInvoicePaymentResponse>(response)
}

export function getInvoicePdfUrl(invoiceId: string): string {
  return `/api/invoices/${encodeURIComponent(invoiceId)}/pdf`
}

export async function downloadInvoicePdf(invoiceId: string): Promise<void> {
  const response = await fetch(getInvoicePdfUrl(invoiceId), {
    credentials: "include",
  })
  if (!response.ok) {
    await expectApiOk(response)
    return
  }

  const blob = await response.blob()
  const disposition = response.headers.get("content-disposition") ?? ""
  const filenameMatch = disposition.match(/filename="([^"]+)"/)
  const filename = filenameMatch?.[1] ?? `invoice-${invoiceId}.pdf`

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
