import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import type { Database } from "better-sqlite3"
import { getUploadDir } from "../config/paths.js"
import {
  calculateProjectServicesEstimate,
  calculateProjectServicesEstimatedHours,
  effectiveProjectServiceHours,
  projectServiceLineTotal,
} from "../lib/service-estimate.js"
import { computeRetainerSummary, getCurrentCycleStart } from "../lib/retainer-cycle.js"
import {
  addDaysToIsoDate,
  computeInvoiceStatus,
  computeOutstandingBalance,
  isInvoiceOverdue,
} from "../lib/invoice.js"
import type {
  Comment,
  ContactLog,
  CreateCommentInput,
  CreateContactLogInput,
  CreateDeliverableInput,
  Client,
  ClientWithProjects,
  CreateClientInput,
  CreateInvoicePaymentInput,
  CreateLeadInput,
  CreateMilestoneInput,
  CreateProjectInput,
  CreateServiceInput,
  CreateVersionInput,
  Deliverable,
  DeliverableStatus,
  DeliverableSummary,
  Invoice,
  InvoiceLineItem,
  InvoicePayment,
  InvoiceSummary,
  InvoiceWithPayments,
  Lead,
  LeadStatus,
  LeadWithContactLog,
  Milestone,
  Project,
  ProjectBudget,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
  ProjectService,
  ProjectServiceWithDetails,
  Service,
  UpdateClientInput,
  UpdateCommentInput,
  UpdateDeliverableInput,
  UpdateInvoiceInput,
  UpdateLeadInput,
  UpdateMilestoneInput,
  UpdateProjectInput,
  UpdateServiceInput,
  Version,
  VersionStatus,
} from "../types/index.js"
import { contactLogTypeIndicatesResponse } from "../types/index.js"
import { DELIVERABLE_STATUSES } from "../types/index.js"
import type { FrameAnnotation } from "../types/annotation.js"
import { getDb, withTransaction } from "./db.js"

interface ProjectRow {
  id: string
  name: string
  createdAt: string
  status: string
  client: string | null
  clientId: string | null
  description: string | null
  startDate: string | null
  endDate: string | null
  budget: string | null
}

interface DeliverableRow {
  id: string
  projectId: string
  name: string
  description: string | null
  status: string
  dueDate: string | null
  createdAt: string
  order: number
}

interface MilestoneRow {
  id: string
  projectId: string
  name: string
  dueDate: string | null
  done: number
  order: number
  createdAt: string
}

interface VersionRow {
  id: string
  projectId: string
  deliverableId: string
  label: string
  filename: string
  uploadedAt: string
  status: string
}

interface CommentRow {
  id: string
  versionId: string
  timestamp: number
  body: string
  author: string
  createdAt: string
  resolved: number
  annotation: string | null
}

interface LeadRow {
  id: string
  name: string
  company: string | null
  email: string
  phone: string | null
  source: string | null
  status: string
  notes: string | null
  lastContactedAt: string | null
  replied: number
  createdAt: string
  updatedAt: string
}

interface ContactLogRow {
  id: string
  leadId: string
  type: string
  notes: string | null
  contactedAt: string
  createdAt: string
}

interface ClientRow {
  id: string
  name: string
  company: string | null
  email: string
  phone: string | null
  website: string | null
  notes: string | null
  convertedFromLeadId: string | null
  isRetainer: number
  retainerHours: number | null
  retainerRate: number | null
  retainerCycleDay: number | null
  createdAt: string
  updatedAt: string
}

interface RetainerCycleHoursRow {
  id: string
  clientId: string
  cycleStart: string
  hoursLogged: number
  createdAt: string
  updatedAt: string
}

interface ServiceRow {
  id: string
  name: string
  hourEstimate: number
  hourlyRate: number
  type: string
  createdAt: string
  updatedAt: string
}

function emptyStatusCounts(): Record<DeliverableStatus, number> {
  return DELIVERABLE_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0
      return acc
    },
    {} as Record<DeliverableStatus, number>,
  )
}

function rowToProject(row: ProjectRow): Project {
  const project: Project = {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    status: row.status as ProjectStatus,
  }

  if (row.client) project.client = row.client
  if (row.clientId) project.clientId = row.clientId
  if (row.description) project.description = row.description
  if (row.startDate) project.startDate = row.startDate
  if (row.endDate) project.endDate = row.endDate
  if (row.budget) project.budget = JSON.parse(row.budget) as ProjectBudget

  return project
}

function rowToDeliverable(row: DeliverableRow): Deliverable {
  const deliverable: Deliverable = {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    status: row.status as DeliverableStatus,
    createdAt: row.createdAt,
    order: row.order,
  }

  if (row.description) deliverable.description = row.description
  if (row.dueDate) deliverable.dueDate = row.dueDate

  return deliverable
}

function rowToMilestone(row: MilestoneRow): Milestone {
  const milestone: Milestone = {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    done: row.done === 1,
    order: row.order,
    createdAt: row.createdAt,
  }

  if (row.dueDate) milestone.dueDate = row.dueDate

  return milestone
}

function rowToVersion(row: VersionRow): Version {
  return {
    id: row.id,
    projectId: row.projectId,
    deliverableId: row.deliverableId,
    label: row.label,
    filename: row.filename,
    uploadedAt: row.uploadedAt,
    status: row.status as VersionStatus,
  }
}

function rowToComment(row: CommentRow): Comment {
  const comment: Comment = {
    id: row.id,
    versionId: row.versionId,
    timestamp: row.timestamp,
    body: row.body,
    author: row.author,
    createdAt: row.createdAt,
    resolved: row.resolved === 1,
  }

  if (row.annotation) {
    comment.annotation = JSON.parse(row.annotation) as FrameAnnotation
  }

  return comment
}

function latestVersion(versions: Version[]): Version | undefined {
  let latest: Version | undefined
  for (const version of versions) {
    if (!latest) {
      latest = version
      continue
    }

    const versionTime = new Date(version.uploadedAt).getTime()
    const latestTime = new Date(latest.uploadedAt).getTime()

    if (
      versionTime > latestTime ||
      (versionTime === latestTime && version.label > latest.label)
    ) {
      latest = version
    }
  }

  return latest
}

function countOpenComments(db: Database, versionIds: string[]): number {
  if (versionIds.length === 0) {
    return 0
  }

  const placeholders = versionIds.map(() => "?").join(", ")
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM comments
       WHERE versionId IN (${placeholders}) AND resolved = 0`,
    )
    .get(...versionIds) as { count: number }

  return row.count
}

// --- Projects ---------------------------------------------------------------

export function listProjects(): Project[] {
  const rows = getDb()
    .prepare("SELECT * FROM projects ORDER BY createdAt ASC")
    .all() as ProjectRow[]

  return rows.map(rowToProject)
}

export function listProjectSummaries(clientId?: string): ProjectSummary[] {
  const db = getDb()
  const projects = clientId ? listProjectsByClientId(clientId) : listProjects()

  return projects.map((project) => {
    const deliverables = listDeliverables(project.id)
    const deliverableIds = deliverables.map((item) => item.id)
    const versions =
      deliverableIds.length === 0
        ? []
        : (db
            .prepare(
              `SELECT * FROM versions
               WHERE deliverableId IN (${deliverableIds.map(() => "?").join(", ")})`,
            )
            .all(...deliverableIds) as VersionRow[]).map(rowToVersion)

    const versionIds = versions.map((version) => version.id)
    const openCommentCount = countOpenComments(db, versionIds)

    const deliverableStatusCounts = emptyStatusCounts()
    for (const deliverable of deliverables) {
      deliverableStatusCounts[deliverable.status] += 1
    }

    const latest = latestVersion(versions)
    const updatedCandidates = [
      project.createdAt,
      ...deliverables.map((item) => item.createdAt),
      ...(latest ? [latest.uploadedAt] : []),
    ]
    const updatedAt = updatedCandidates.reduce((a, b) => (a > b ? a : b))

    const nextMilestone = listMilestones(project.id).find(
      (milestone) => !milestone.done,
    )

    const linkedClient = project.clientId ? getClient(project.clientId) : undefined
    const clientName = linkedClient
      ? linkedClient.company?.trim() || linkedClient.name
      : undefined

    const projectServices = listProjectServices(project.id)
    const servicesTotal = calculateProjectServicesEstimate(projectServices)
    const servicesEstimate =
      projectServices.length > 0 ? servicesTotal : undefined
    const servicesEstimatedHours =
      projectServices.length > 0
        ? calculateProjectServicesEstimatedHours(projectServices)
        : undefined

    return {
      ...project,
      deliverableCount: deliverables.length,
      versionCount: versions.length,
      openCommentCount,
      updatedAt,
      deliverableStatusCounts,
      nextMilestone: nextMilestone
        ? {
            id: nextMilestone.id,
            name: nextMilestone.name,
            dueDate: nextMilestone.dueDate,
          }
        : null,
      ...(clientName ? { clientName } : {}),
      ...(servicesEstimate !== undefined ? { servicesEstimate } : {}),
      ...(servicesEstimatedHours !== undefined
        ? { servicesEstimatedHours }
        : {}),
    }
  })
}

export function getProject(id: string): Project | undefined {
  const row = getDb()
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as ProjectRow | undefined

  return row ? rowToProject(row) : undefined
}

export function getProjectWithClient(id: string): ProjectDetail | undefined {
  const project = getProject(id)
  if (!project) {
    return undefined
  }

  const client = project.clientId ? (getClient(project.clientId) ?? null) : null
  const outstandingBalance = getProjectOutstandingBalance(id)

  return {
    ...project,
    client,
    ...(outstandingBalance > 0 ? { outstandingBalance } : {}),
  }
}

export function createProject(input: CreateProjectInput): Project {
  return withTransaction(() => {
    const id = input.id ?? randomUUID()
    const project: Project = {
      id,
      name: input.name,
      createdAt: new Date().toISOString(),
      status: input.status ?? "active",
      ...(input.client ? { client: input.client } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.startDate ? { startDate: input.startDate } : {}),
      ...(input.endDate ? { endDate: input.endDate } : {}),
      ...(input.budget ? { budget: input.budget } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO projects (
          id, name, createdAt, status, client, clientId, description, startDate, endDate, budget
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        project.id,
        project.name,
        project.createdAt,
        project.status,
        project.client ?? null,
        project.clientId ?? null,
        project.description ?? null,
        project.startDate ?? null,
        project.endDate ?? null,
        project.budget ? JSON.stringify(project.budget) : null,
      )

    return project
  })
}

export function duplicateProject(sourceProjectId: string): Project | undefined {
  return withTransaction(() => {
    const source = getProject(sourceProjectId)
    if (!source) {
      return undefined
    }

    const now = new Date().toISOString()
    const newProject: Project = {
      id: randomUUID(),
      name: `${source.name} (Copy)`,
      createdAt: now,
      status: "active",
      ...(source.description ? { description: source.description } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO projects (
          id, name, createdAt, status, client, clientId, description, startDate, endDate, budget
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        newProject.id,
        newProject.name,
        newProject.createdAt,
        newProject.status,
        null,
        null,
        newProject.description ?? null,
        null,
        null,
        null,
      )

    const sourceServices = getDb()
      .prepare(
        `SELECT serviceId, quantity, overrideHours
         FROM project_services
         WHERE projectId = ?`,
      )
      .all(sourceProjectId) as Array<{
      serviceId: string
      quantity: number
      overrideHours: number | null
    }>

    const insertService = getDb().prepare(
      `INSERT INTO project_services (
        id, projectId, serviceId, quantity, overrideHours, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )

    for (const service of sourceServices) {
      insertService.run(
        randomUUID(),
        newProject.id,
        service.serviceId,
        service.quantity,
        service.overrideHours,
        now,
      )
    }

    const sourceMilestones = getDb()
      .prepare(
        `SELECT name, "order"
         FROM milestones
         WHERE projectId = ?
         ORDER BY "order" ASC`,
      )
      .all(sourceProjectId) as Array<{ name: string; order: number }>

    const insertMilestone = getDb().prepare(
      `INSERT INTO milestones (
        id, projectId, name, dueDate, done, "order", createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )

    for (const milestone of sourceMilestones) {
      insertMilestone.run(
        randomUUID(),
        newProject.id,
        milestone.name,
        null,
        0,
        milestone.order,
        now,
      )
    }

    return newProject
  })
}

export function updateProject(
  id: string,
  input: UpdateProjectInput,
): Project | undefined {
  return withTransaction(() => {
    const project = getProject(id)
    if (!project) {
      return undefined
    }

    if (input.name !== undefined) project.name = input.name
    if (input.status !== undefined) project.status = input.status

    applyNullableString(project, "client", input.client)
    applyNullableString(project, "clientId", input.clientId)
    applyNullableString(project, "description", input.description)
    applyNullableString(project, "startDate", input.startDate)
    applyNullableString(project, "endDate", input.endDate)

    if (input.budget === null) {
      delete project.budget
    } else if (input.budget !== undefined) {
      project.budget = input.budget
    }

    getDb()
      .prepare(
        `UPDATE projects
         SET name = ?, status = ?, client = ?, clientId = ?, description = ?,
             startDate = ?, endDate = ?, budget = ?
         WHERE id = ?`,
      )
      .run(
        project.name,
        project.status,
        project.client ?? null,
        project.clientId ?? null,
        project.description ?? null,
        project.startDate ?? null,
        project.endDate ?? null,
        project.budget ? JSON.stringify(project.budget) : null,
        id,
      )

    return project
  })
}

function applyNullableString<T extends object>(
  target: T,
  key: keyof T & string,
  value: string | null | undefined,
): void {
  if (value === undefined) return
  const record = target as Record<string, unknown>
  if (value === null || value === "") {
    delete record[key]
  } else {
    record[key] = value
  }
}

export function deleteProject(id: string): boolean {
  return withTransaction(() => {
    const result = getDb().prepare("DELETE FROM projects WHERE id = ?").run(id)
    return result.changes > 0
  })
}

export function ensureProject(id: string, name?: string): Project {
  const existing = getProject(id)
  if (existing) {
    return existing
  }

  return createProject({ id, name: name ?? id })
}

// --- Deliverables -----------------------------------------------------------

export function listDeliverables(projectId: string): Deliverable[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM deliverables
       WHERE projectId = ?
       ORDER BY "order" ASC, createdAt ASC`,
    )
    .all(projectId) as DeliverableRow[]

  return rows.map(rowToDeliverable)
}

export function listDeliverableSummaries(projectId: string): DeliverableSummary[] {
  const db = getDb()
  const deliverables = listDeliverables(projectId)

  return deliverables.map((deliverable) => {
    const versions = listVersions(deliverable.id)
    const versionIds = versions.map((version) => version.id)
    const openCommentCount = countOpenComments(db, versionIds)
    const latest = latestVersion(versions)

    return {
      ...deliverable,
      versionCount: versions.length,
      openCommentCount,
      updatedAt: latest?.uploadedAt ?? deliverable.createdAt,
      latestVersionStatus: latest?.status ?? null,
    }
  })
}

export function getDeliverable(id: string): Deliverable | undefined {
  const row = getDb()
    .prepare("SELECT * FROM deliverables WHERE id = ?")
    .get(id) as DeliverableRow | undefined

  return row ? rowToDeliverable(row) : undefined
}

export function createDeliverable(input: CreateDeliverableInput): Deliverable {
  return withTransaction(() => {
    const row = getDb()
      .prepare(
        `SELECT COALESCE(MAX("order"), -1) AS maxOrder
         FROM deliverables WHERE projectId = ?`,
      )
      .get(input.projectId) as { maxOrder: number }

    const deliverable: Deliverable = {
      id: randomUUID(),
      projectId: input.projectId,
      name: input.name,
      status: input.status ?? "not_started",
      createdAt: new Date().toISOString(),
      order: row.maxOrder + 1,
      ...(input.description ? { description: input.description } : {}),
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO deliverables (
          id, projectId, name, description, status, dueDate, createdAt, "order"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        deliverable.id,
        deliverable.projectId,
        deliverable.name,
        deliverable.description ?? null,
        deliverable.status,
        deliverable.dueDate ?? null,
        deliverable.createdAt,
        deliverable.order,
      )

    return deliverable
  })
}

export function updateDeliverable(
  id: string,
  input: UpdateDeliverableInput,
): Deliverable | undefined {
  return withTransaction(() => {
    const deliverable = getDeliverable(id)
    if (!deliverable) {
      return undefined
    }

    if (input.name !== undefined) deliverable.name = input.name
    if (input.status !== undefined) deliverable.status = input.status

    applyNullableString(deliverable, "description", input.description)
    applyNullableString(deliverable, "dueDate", input.dueDate)

    getDb()
      .prepare(
        `UPDATE deliverables
         SET name = ?, description = ?, status = ?, dueDate = ?
         WHERE id = ?`,
      )
      .run(
        deliverable.name,
        deliverable.description ?? null,
        deliverable.status,
        deliverable.dueDate ?? null,
        id,
      )

    return deliverable
  })
}

export function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
): Deliverable | undefined {
  return updateDeliverable(id, { status })
}

export function deleteDeliverable(id: string): boolean {
  return withTransaction(() => {
    const result = getDb()
      .prepare("DELETE FROM deliverables WHERE id = ?")
      .run(id)
    return result.changes > 0
  })
}

// --- Milestones -------------------------------------------------------------

export function listMilestones(projectId: string): Milestone[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM milestones
       WHERE projectId = ?
       ORDER BY
         CASE WHEN dueDate IS NULL THEN 1 ELSE 0 END,
         dueDate ASC,
         "order" ASC`,
    )
    .all(projectId) as MilestoneRow[]

  return rows.map(rowToMilestone)
}

export function getMilestone(id: string): Milestone | undefined {
  const row = getDb()
    .prepare("SELECT * FROM milestones WHERE id = ?")
    .get(id) as MilestoneRow | undefined

  return row ? rowToMilestone(row) : undefined
}

export function createMilestone(input: CreateMilestoneInput): Milestone {
  return withTransaction(() => {
    const row = getDb()
      .prepare(
        `SELECT COALESCE(MAX("order"), -1) AS maxOrder
         FROM milestones WHERE projectId = ?`,
      )
      .get(input.projectId) as { maxOrder: number }

    const milestone: Milestone = {
      id: randomUUID(),
      projectId: input.projectId,
      name: input.name,
      done: input.done ?? false,
      order: row.maxOrder + 1,
      createdAt: new Date().toISOString(),
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO milestones (
          id, projectId, name, dueDate, done, "order", createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        milestone.id,
        milestone.projectId,
        milestone.name,
        milestone.dueDate ?? null,
        milestone.done ? 1 : 0,
        milestone.order,
        milestone.createdAt,
      )

    return milestone
  })
}

export function updateMilestone(
  id: string,
  input: UpdateMilestoneInput,
): Milestone | undefined {
  return withTransaction(() => {
    const milestone = getMilestone(id)
    if (!milestone) {
      return undefined
    }

    if (input.name !== undefined) milestone.name = input.name
    if (input.done !== undefined) milestone.done = input.done

    applyNullableString(milestone, "dueDate", input.dueDate)

    getDb()
      .prepare(
        `UPDATE milestones
         SET name = ?, dueDate = ?, done = ?
         WHERE id = ?`,
      )
      .run(
        milestone.name,
        milestone.dueDate ?? null,
        milestone.done ? 1 : 0,
        id,
      )

    return milestone
  })
}

export function deleteMilestone(id: string): boolean {
  return withTransaction(() => {
    const result = getDb().prepare("DELETE FROM milestones WHERE id = ?").run(id)
    return result.changes > 0
  })
}

// --- Versions ---------------------------------------------------------------

export function listVersions(deliverableId: string): Version[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM versions
       WHERE deliverableId = ?
       ORDER BY uploadedAt DESC`,
    )
    .all(deliverableId) as VersionRow[]

  return rows.map(rowToVersion)
}

export function listVersionsByProject(projectId: string): Version[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM versions
       WHERE projectId = ?
       ORDER BY uploadedAt DESC`,
    )
    .all(projectId) as VersionRow[]

  return rows.map(rowToVersion)
}

export function getVersion(id: string): Version | undefined {
  const row = getDb()
    .prepare("SELECT * FROM versions WHERE id = ?")
    .get(id) as VersionRow | undefined

  return row ? rowToVersion(row) : undefined
}

export function getVersionByLabel(
  deliverableId: string,
  label: string,
): Version | undefined {
  const row = getDb()
    .prepare(
      `SELECT * FROM versions
       WHERE deliverableId = ? AND label = ?`,
    )
    .get(deliverableId, label) as VersionRow | undefined

  return row ? rowToVersion(row) : undefined
}

export function createVersion(input: CreateVersionInput): Version {
  return withTransaction(() => {
    const existing = getVersionByLabel(input.deliverableId, input.label)

    if (existing) {
      const uploadedAt = new Date().toISOString()
      getDb()
        .prepare(
          `UPDATE versions
           SET filename = ?, uploadedAt = ?, status = ?
           WHERE id = ?`,
        )
        .run(input.filename, uploadedAt, "pending_review", existing.id)

      return {
        ...existing,
        filename: input.filename,
        uploadedAt,
        status: "pending_review",
      }
    }

    const version: Version = {
      id: randomUUID(),
      projectId: input.projectId,
      deliverableId: input.deliverableId,
      label: input.label,
      filename: input.filename,
      uploadedAt: new Date().toISOString(),
      status: "pending_review",
    }

    getDb()
      .prepare(
        `INSERT INTO versions (
          id, projectId, deliverableId, label, filename, uploadedAt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        version.id,
        version.projectId,
        version.deliverableId,
        version.label,
        version.filename,
        version.uploadedAt,
        version.status,
      )

    return version
  })
}

export function updateVersionStatus(
  id: string,
  status: VersionStatus,
): Version | undefined {
  return withTransaction(() => {
    const version = getVersion(id)

    if (!version) {
      return undefined
    }

    getDb()
      .prepare("UPDATE versions SET status = ? WHERE id = ?")
      .run(status, id)

    return { ...version, status }
  })
}

export function updateVersionLabel(
  id: string,
  label: string,
): Version | "not_found" | "conflict" {
  return withTransaction(() => {
    const version = getVersion(id)

    if (!version) {
      return "not_found"
    }

    if (version.label === label) {
      return version
    }

    const conflict = getVersionByLabel(version.deliverableId, label)

    if (conflict && conflict.id !== id) {
      return "conflict"
    }

    const oldDir = getUploadDir(version.projectId, version.deliverableId, version.label)
    const newDir = getUploadDir(version.projectId, version.deliverableId, label)

    if (fs.existsSync(oldDir)) {
      if (fs.existsSync(newDir)) {
        return "conflict"
      }

      fs.mkdirSync(path.dirname(newDir), { recursive: true })
      fs.renameSync(oldDir, newDir)
    }

    getDb()
      .prepare("UPDATE versions SET label = ? WHERE id = ?")
      .run(label, id)

    return { ...version, label }
  })
}

// --- Comments ---------------------------------------------------------------

export function listComments(versionId: string): Comment[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM comments
       WHERE versionId = ?
       ORDER BY timestamp ASC`,
    )
    .all(versionId) as CommentRow[]

  return rows.map(rowToComment)
}

export function getComment(id: string): Comment | undefined {
  const row = getDb()
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(id) as CommentRow | undefined

  return row ? rowToComment(row) : undefined
}

export function createComment(input: CreateCommentInput): Comment {
  return withTransaction(() => {
    const comment: Comment = {
      id: randomUUID(),
      versionId: input.versionId,
      timestamp: input.timestamp,
      body: input.body,
      author: input.author,
      createdAt: new Date().toISOString(),
      resolved: false,
      ...(input.annotation ? { annotation: input.annotation } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO comments (
          id, versionId, timestamp, body, author, createdAt, resolved, annotation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        comment.id,
        comment.versionId,
        comment.timestamp,
        comment.body,
        comment.author,
        comment.createdAt,
        0,
        comment.annotation ? JSON.stringify(comment.annotation) : null,
      )

    return comment
  })
}

export function updateComment(
  id: string,
  input: UpdateCommentInput,
): Comment | undefined {
  return withTransaction(() => {
    const comment = getComment(id)

    if (!comment) {
      return undefined
    }

    if (input.body !== undefined) {
      comment.body = input.body
    }

    if (input.resolved !== undefined) {
      comment.resolved = input.resolved
    }

    getDb()
      .prepare(
        `UPDATE comments
         SET body = ?, resolved = ?
         WHERE id = ?`,
      )
      .run(comment.body, comment.resolved ? 1 : 0, id)

    return comment
  })
}

export function deleteComment(id: string): boolean {
  return withTransaction(() => {
    const result = getDb().prepare("DELETE FROM comments WHERE id = ?").run(id)
    return result.changes > 0
  })
}

// --- Leads ------------------------------------------------------------------

export interface ListLeadsFilters {
  status?: LeadStatus
  replied?: boolean
}

function rowToLead(row: LeadRow): Lead {
  const lead: Lead = {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status as LeadStatus,
    replied: row.replied === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }

  if (row.company) lead.company = row.company
  if (row.phone) lead.phone = row.phone
  if (row.source) lead.source = row.source
  if (row.notes) lead.notes = row.notes
  if (row.lastContactedAt) lead.lastContactedAt = row.lastContactedAt

  return lead
}

function rowToContactLog(row: ContactLogRow): ContactLog {
  const entry: ContactLog = {
    id: row.id,
    leadId: row.leadId,
    type: row.type as ContactLog["type"],
    contactedAt: row.contactedAt,
    createdAt: row.createdAt,
  }

  if (row.notes) entry.notes = row.notes

  return entry
}

export function listLeads(filters: ListLeadsFilters = {}): Lead[] {
  const conditions: string[] = []
  const params: Array<string | number> = []

  if (filters.status !== undefined) {
    conditions.push("status = ?")
    params.push(filters.status)
  } else {
    // Converted leads become clients and are hidden from the pipeline list.
    // They remain fetchable by id (and by an explicit status filter).
    conditions.push("status != ?")
    params.push("converted")
  }

  if (filters.replied !== undefined) {
    conditions.push("replied = ?")
    params.push(filters.replied ? 1 : 0)
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const rows = getDb()
    .prepare(
      `SELECT * FROM leads ${where} ORDER BY updatedAt DESC, createdAt DESC`,
    )
    .all(...params) as LeadRow[]

  return rows.map(rowToLead)
}

export function getLead(id: string): Lead | undefined {
  const row = getDb()
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(id) as LeadRow | undefined

  return row ? rowToLead(row) : undefined
}

export function getLeadWithContactLog(id: string): LeadWithContactLog | undefined {
  const lead = getLead(id)
  if (!lead) {
    return undefined
  }

  return {
    ...lead,
    contactLog: listContactLog(id),
  }
}

export function createLead(input: CreateLeadInput): Lead {
  return withTransaction(() => {
    const now = new Date().toISOString()
    const lead: Lead = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      status: input.status ?? "new",
      replied: input.replied ?? false,
      createdAt: now,
      updatedAt: now,
      ...(input.company ? { company: input.company } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.lastContactedAt
        ? { lastContactedAt: input.lastContactedAt }
        : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO leads (
          id, name, company, email, phone, source, status, notes,
          lastContactedAt, replied, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        lead.id,
        lead.name,
        lead.company ?? null,
        lead.email,
        lead.phone ?? null,
        lead.source ?? null,
        lead.status,
        lead.notes ?? null,
        lead.lastContactedAt ?? null,
        lead.replied ? 1 : 0,
        lead.createdAt,
        lead.updatedAt,
      )

    return lead
  })
}

export function updateLead(
  id: string,
  input: UpdateLeadInput,
): Lead | undefined {
  return withTransaction(() => {
    const lead = getLead(id)

    if (!lead) {
      return undefined
    }

    if (input.name !== undefined) lead.name = input.name
    if (input.email !== undefined) lead.email = input.email
    if (input.status !== undefined) lead.status = input.status
    if (input.replied !== undefined) lead.replied = input.replied
    applyNullableString(lead, "company", input.company)
    applyNullableString(lead, "phone", input.phone)
    applyNullableString(lead, "source", input.source)
    applyNullableString(lead, "notes", input.notes)
    applyNullableString(lead, "lastContactedAt", input.lastContactedAt)

    lead.updatedAt = new Date().toISOString()

    getDb()
      .prepare(
        `UPDATE leads
         SET name = ?, company = ?, email = ?, phone = ?, source = ?,
             status = ?, notes = ?, lastContactedAt = ?, replied = ?,
             updatedAt = ?
         WHERE id = ?`,
      )
      .run(
        lead.name,
        lead.company ?? null,
        lead.email,
        lead.phone ?? null,
        lead.source ?? null,
        lead.status,
        lead.notes ?? null,
        lead.lastContactedAt ?? null,
        lead.replied ? 1 : 0,
        lead.updatedAt,
        id,
      )

    return lead
  })
}

export function deleteLead(id: string): boolean {
  return withTransaction(() => {
    const result = getDb().prepare("DELETE FROM leads WHERE id = ?").run(id)
    return result.changes > 0
  })
}

// --- Contact log ------------------------------------------------------------

export function listContactLog(leadId: string): ContactLog[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM contact_log
       WHERE leadId = ?
       ORDER BY contactedAt DESC, createdAt DESC`,
    )
    .all(leadId) as ContactLogRow[]

  return rows.map(rowToContactLog)
}

export function getContactLog(id: string): ContactLog | undefined {
  const row = getDb()
    .prepare("SELECT * FROM contact_log WHERE id = ?")
    .get(id) as ContactLogRow | undefined

  return row ? rowToContactLog(row) : undefined
}

export function createContactLog(input: CreateContactLogInput): ContactLog {
  return withTransaction(() => {
    const now = new Date().toISOString()
    const entry: ContactLog = {
      id: randomUUID(),
      leadId: input.leadId,
      type: input.type,
      contactedAt: input.contactedAt,
      createdAt: now,
      ...(input.notes ? { notes: input.notes } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO contact_log (
          id, leadId, type, notes, contactedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.leadId,
        entry.type,
        entry.notes ?? null,
        entry.contactedAt,
        entry.createdAt,
      )

    const indicatesResponse =
      input.indicatesResponse === true ||
      contactLogTypeIndicatesResponse(input.type)

    const lead = getLead(input.leadId)
    if (lead) {
      lead.lastContactedAt = input.contactedAt
      if (indicatesResponse) {
        lead.replied = true
      }
      lead.updatedAt = now

      getDb()
        .prepare(
          `UPDATE leads
           SET lastContactedAt = ?, replied = ?, updatedAt = ?
           WHERE id = ?`,
        )
        .run(
          lead.lastContactedAt,
          lead.replied ? 1 : 0,
          lead.updatedAt,
          input.leadId,
        )
    }

    return entry
  })
}

export function deleteContactLog(id: string): boolean {
  return withTransaction(() => {
    const result = getDb()
      .prepare("DELETE FROM contact_log WHERE id = ?")
      .run(id)
    return result.changes > 0
  })
}

// --- Clients ----------------------------------------------------------------

function rowToClient(row: ClientRow): Client {
  const client: Client = {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }

  if (row.company) client.company = row.company
  if (row.phone) client.phone = row.phone
  if (row.website) client.website = row.website
  if (row.notes) client.notes = row.notes
  if (row.convertedFromLeadId) {
    client.convertedFromLeadId = row.convertedFromLeadId
  }
  if (row.isRetainer) {
    client.isRetainer = true
    if (row.retainerHours != null) client.retainerHours = row.retainerHours
    if (row.retainerRate != null) client.retainerRate = row.retainerRate
    if (row.retainerCycleDay != null) {
      client.retainerCycleDay = row.retainerCycleDay
    }
  }

  return client
}

function getRetainerCycleHours(
  clientId: string,
  cycleStart: string,
): number {
  const row = getDb()
    .prepare(
      `SELECT hoursLogged FROM retainer_cycle_hours
       WHERE clientId = ? AND cycleStart = ?`,
    )
    .get(clientId, cycleStart) as { hoursLogged: number } | undefined

  return row?.hoursLogged ?? 0
}

export function upsertRetainerCycleHours(
  clientId: string,
  cycleStart: string,
  hoursLogged: number,
): number {
  return withTransaction(() => {
    const now = new Date().toISOString()
    const existing = getDb()
      .prepare(
        `SELECT id FROM retainer_cycle_hours
         WHERE clientId = ? AND cycleStart = ?`,
      )
      .get(clientId, cycleStart) as { id: string } | undefined

    if (existing) {
      getDb()
        .prepare(
          `UPDATE retainer_cycle_hours
           SET hoursLogged = ?, updatedAt = ?
           WHERE id = ?`,
        )
        .run(hoursLogged, now, existing.id)
    } else {
      getDb()
        .prepare(
          `INSERT INTO retainer_cycle_hours (
            id, clientId, cycleStart, hoursLogged, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(randomUUID(), clientId, cycleStart, hoursLogged, now, now)
    }

    return hoursLogged
  })
}

function buildRetainerSummary(client: Client) {
  if (
    !client.isRetainer ||
    client.retainerHours == null ||
    client.retainerRate == null ||
    client.retainerCycleDay == null
  ) {
    return undefined
  }

  const cycleStart = getCurrentCycleStart(client.retainerCycleDay)
  const hoursLogged = getRetainerCycleHours(client.id, cycleStart)

  return computeRetainerSummary({
    retainerHours: client.retainerHours,
    retainerRate: client.retainerRate,
    retainerCycleDay: client.retainerCycleDay,
    hoursLogged,
  })
}

export function listClients(): Client[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM clients ORDER BY updatedAt DESC, createdAt DESC",
    )
    .all() as ClientRow[]

  return rows.map(rowToClient)
}

export function getClient(id: string): Client | undefined {
  const row = getDb()
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(id) as ClientRow | undefined

  return row ? rowToClient(row) : undefined
}

export function listProjectsByClientId(clientId: string): Project[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM projects
       WHERE clientId = ?
       ORDER BY createdAt DESC`,
    )
    .all(clientId) as ProjectRow[]

  return rows.map(rowToProject)
}

export function getClientWithProjects(
  id: string,
): ClientWithProjects | undefined {
  const client = getClient(id)
  if (!client) {
    return undefined
  }

  const outstandingBalance = getClientOutstandingBalance(id)
  const retainerSummary = buildRetainerSummary(client)

  return {
    ...client,
    projects: listProjectsByClientId(id),
    ...(outstandingBalance > 0 ? { outstandingBalance } : {}),
    ...(retainerSummary ? { retainerSummary } : {}),
  }
}

export function createClient(input: CreateClientInput): Client {
  return withTransaction(() => {
    const now = new Date().toISOString()
    const client: Client = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      createdAt: now,
      updatedAt: now,
      ...(input.company ? { company: input.company } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.website ? { website: input.website } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.convertedFromLeadId
        ? { convertedFromLeadId: input.convertedFromLeadId }
        : {}),
      ...(input.isRetainer
        ? {
            isRetainer: true,
            ...(input.retainerHours != null
              ? { retainerHours: input.retainerHours }
              : {}),
            ...(input.retainerRate != null
              ? { retainerRate: input.retainerRate }
              : {}),
            ...(input.retainerCycleDay != null
              ? { retainerCycleDay: input.retainerCycleDay }
              : {}),
          }
        : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO clients (
          id, name, company, email, phone, website, notes,
          convertedFromLeadId, isRetainer, retainerHours, retainerRate,
          retainerCycleDay, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        client.id,
        client.name,
        client.company ?? null,
        client.email,
        client.phone ?? null,
        client.website ?? null,
        client.notes ?? null,
        client.convertedFromLeadId ?? null,
        client.isRetainer ? 1 : 0,
        client.retainerHours ?? null,
        client.retainerRate ?? null,
        client.retainerCycleDay ?? null,
        client.createdAt,
        client.updatedAt,
      )

    return client
  })
}

export function updateClient(
  id: string,
  input: UpdateClientInput,
): Client | undefined {
  return withTransaction(() => {
    const client = getClient(id)

    if (!client) {
      return undefined
    }

    if (input.name !== undefined) client.name = input.name
    if (input.email !== undefined) client.email = input.email
    applyNullableString(client, "company", input.company)
    applyNullableString(client, "phone", input.phone)
    applyNullableString(client, "website", input.website)
    applyNullableString(client, "notes", input.notes)
    applyNullableString(client, "convertedFromLeadId", input.convertedFromLeadId)

    if (input.isRetainer !== undefined) {
      client.isRetainer = input.isRetainer
      if (!input.isRetainer) {
        delete client.retainerHours
        delete client.retainerRate
        delete client.retainerCycleDay
      }
    }

    if (input.retainerHours !== undefined) {
      if (input.retainerHours === null) {
        delete client.retainerHours
      } else {
        client.retainerHours = input.retainerHours
      }
    }

    if (input.retainerRate !== undefined) {
      if (input.retainerRate === null) {
        delete client.retainerRate
      } else {
        client.retainerRate = input.retainerRate
      }
    }

    if (input.retainerCycleDay !== undefined) {
      if (input.retainerCycleDay === null) {
        delete client.retainerCycleDay
      } else {
        client.retainerCycleDay = input.retainerCycleDay
      }
    }

    client.updatedAt = new Date().toISOString()

    getDb()
      .prepare(
        `UPDATE clients
         SET name = ?, company = ?, email = ?, phone = ?, website = ?,
             notes = ?, convertedFromLeadId = ?, isRetainer = ?,
             retainerHours = ?, retainerRate = ?, retainerCycleDay = ?,
             updatedAt = ?
         WHERE id = ?`,
      )
      .run(
        client.name,
        client.company ?? null,
        client.email,
        client.phone ?? null,
        client.website ?? null,
        client.notes ?? null,
        client.convertedFromLeadId ?? null,
        client.isRetainer ? 1 : 0,
        client.retainerHours ?? null,
        client.retainerRate ?? null,
        client.retainerCycleDay ?? null,
        client.updatedAt,
        id,
      )

    return client
  })
}

export function countNonArchivedProjectsByClientId(clientId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM projects
       WHERE clientId = ? AND status != 'archived'`,
    )
    .get(clientId) as { count: number }

  return row.count
}

export function deleteClient(
  id: string,
): "deleted" | "not_found" | "has_active_projects" {
  return withTransaction(() => {
    if (!getClient(id)) {
      return "not_found"
    }

    if (countNonArchivedProjectsByClientId(id) > 0) {
      return "has_active_projects"
    }

    const result = getDb().prepare("DELETE FROM clients WHERE id = ?").run(id)
    return result.changes > 0 ? "deleted" : "not_found"
  })
}

export function convertLeadToClient(
  leadId: string,
  options?: { notes?: string },
): Client | "not_found" | "already_converted" {
  return withTransaction(() => {
    const lead = getLead(leadId)

    if (!lead) {
      return "not_found"
    }

    if (lead.status === "converted") {
      return "already_converted"
    }

    const existingClient = getDb()
      .prepare("SELECT id FROM clients WHERE convertedFromLeadId = ?")
      .get(leadId) as { id: string } | undefined

    if (existingClient) {
      return "already_converted"
    }

    const now = new Date().toISOString()
    const notes = options?.notes?.trim() || undefined
    const client: Client = {
      id: randomUUID(),
      name: lead.name,
      email: lead.email,
      convertedFromLeadId: leadId,
      createdAt: now,
      updatedAt: now,
      ...(lead.company ? { company: lead.company } : {}),
      ...(lead.phone ? { phone: lead.phone } : {}),
      ...(notes ? { notes } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO clients (
          id, name, company, email, phone, website, notes,
          convertedFromLeadId, isRetainer, retainerHours, retainerRate,
          retainerCycleDay, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        client.id,
        client.name,
        client.company ?? null,
        client.email,
        client.phone ?? null,
        null,
        client.notes ?? null,
        client.convertedFromLeadId ?? null,
        0,
        null,
        null,
        null,
        client.createdAt,
        client.updatedAt,
      )

    getDb()
      .prepare(
        `UPDATE leads
         SET status = ?, updatedAt = ?
         WHERE id = ?`,
      )
      .run("converted", now, leadId)

    return client
  })
}

/** Pipeline status assigned to a lead when a client is reverted back to one. */
const REVERTED_LEAD_STATUS: LeadStatus = "negotiating"

export function revertClientToLead(
  clientId: string,
): Lead | "not_found" | "has_active_projects" {
  return withTransaction(() => {
    const client = getClient(clientId)

    if (!client) {
      return "not_found"
    }

    if (countNonArchivedProjectsByClientId(clientId) > 0) {
      return "has_active_projects"
    }

    const now = new Date().toISOString()
    const originalLead = client.convertedFromLeadId
      ? getLead(client.convertedFromLeadId)
      : undefined

    let lead: Lead

    if (originalLead) {
      // Restore the source lead, syncing the client's current contact details
      // (which may have been edited after conversion). Its contact log and
      // source are preserved.
      getDb()
        .prepare(
          `UPDATE leads
           SET name = ?, company = ?, email = ?, phone = ?, status = ?,
               updatedAt = ?
           WHERE id = ?`,
        )
        .run(
          client.name,
          client.company ?? null,
          client.email,
          client.phone ?? null,
          REVERTED_LEAD_STATUS,
          now,
          originalLead.id,
        )

      lead = getLead(originalLead.id)!
    } else {
      lead = createLead({
        name: client.name,
        email: client.email,
        status: REVERTED_LEAD_STATUS,
        ...(client.company ? { company: client.company } : {}),
        ...(client.phone ? { phone: client.phone } : {}),
        ...(client.notes ? { notes: client.notes } : {}),
      })
    }

    getDb().prepare("DELETE FROM clients WHERE id = ?").run(clientId)

    return lead
  })
}

function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    hourEstimate: row.hourEstimate,
    hourlyRate: row.hourlyRate,
    type: row.type as Service["type"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function listServices(): Service[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM services ORDER BY updatedAt DESC, createdAt DESC",
    )
    .all() as ServiceRow[]

  return rows.map(rowToService)
}

export function getService(id: string): Service | undefined {
  const row = getDb()
    .prepare("SELECT * FROM services WHERE id = ?")
    .get(id) as ServiceRow | undefined

  return row ? rowToService(row) : undefined
}

export function createService(input: CreateServiceInput): Service {
  return withTransaction(() => {
    const now = new Date().toISOString()
    const service: Service = {
      id: randomUUID(),
      name: input.name,
      hourEstimate: input.hourEstimate,
      hourlyRate: input.hourlyRate,
      type: input.type,
      createdAt: now,
      updatedAt: now,
    }

    getDb()
      .prepare(
        `INSERT INTO services (
          id, name, hourEstimate, hourlyRate, type, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        service.id,
        service.name,
        service.hourEstimate,
        service.hourlyRate,
        service.type,
        service.createdAt,
        service.updatedAt,
      )

    return service
  })
}

export function updateService(
  id: string,
  input: UpdateServiceInput,
): Service | undefined {
  return withTransaction(() => {
    const service = getService(id)

    if (!service) {
      return undefined
    }

    service.name = input.name
    service.hourEstimate = input.hourEstimate
    service.hourlyRate = input.hourlyRate
    service.type = input.type
    service.updatedAt = new Date().toISOString()

    getDb()
      .prepare(
        `UPDATE services
         SET name = ?, hourEstimate = ?, hourlyRate = ?, type = ?, updatedAt = ?
         WHERE id = ?`,
      )
      .run(
        service.name,
        service.hourEstimate,
        service.hourlyRate,
        service.type,
        service.updatedAt,
        id,
      )

    return service
  })
}

export function deleteService(id: string): "deleted" | "not_found" {
  return withTransaction(() => {
    const result = getDb().prepare("DELETE FROM services WHERE id = ?").run(id)
    return result.changes > 0 ? "deleted" : "not_found"
  })
}

export interface ServiceProjectUsage {
  projectCount: number
  projects: Array<{ id: string; name: string }>
}

export function getServiceProjectUsage(
  serviceId: string,
): ServiceProjectUsage | undefined {
  if (!getService(serviceId)) {
    return undefined
  }

  const projects = getDb()
    .prepare(
      `SELECT p.id, p.name
       FROM project_services ps
       JOIN projects p ON p.id = ps.projectId
       WHERE ps.serviceId = ?
       ORDER BY p.name ASC`,
    )
    .all(serviceId) as Array<{ id: string; name: string }>

  return {
    projectCount: projects.length,
    projects,
  }
}

interface ProjectServiceRow {
  id: string
  projectId: string
  serviceId: string
  quantity: number
  overrideHours: number | null
  createdAt: string
}

interface InvoiceRow {
  id: string
  invoiceNumber: number
  projectId: string
  clientId: string
  projectName: string
  clientName: string
  clientCompany: string | null
  clientEmail: string
  currency: string
  grandTotal: number
  lineItems: string
  invoiceDate: string
  dueDate: string
  status: string
  createdAt: string
}

interface InvoicePaymentRow {
  id: string
  invoiceId: string
  amount: number
  paidAt: string
  notes: string | null
  createdAt: string
}

function rowToProjectService(row: ProjectServiceRow): ProjectService {
  return {
    id: row.id,
    projectId: row.projectId,
    serviceId: row.serviceId,
    quantity: row.quantity,
    overrideHours: row.overrideHours ?? null,
    createdAt: row.createdAt,
  }
}

export function listProjectServices(
  projectId: string,
): ProjectServiceWithDetails[] {
  const rows = getDb()
    .prepare(
      `SELECT
        ps.id,
        ps.projectId,
        ps.serviceId,
        ps.quantity,
        ps.overrideHours,
        ps.createdAt,
        s.id AS service_id,
        s.name,
        s.hourEstimate,
        s.hourlyRate,
        s.type,
        s.createdAt AS service_createdAt,
        s.updatedAt AS service_updatedAt
       FROM project_services ps
       INNER JOIN services s ON s.id = ps.serviceId
       WHERE ps.projectId = ?
       ORDER BY ps.createdAt ASC`,
    )
    .all(projectId) as Array<
    ProjectServiceRow & {
      service_id: string
      name: string
      hourEstimate: number
      hourlyRate: number
      type: string
      service_createdAt: string
      service_updatedAt: string
    }
  >

  return rows.map((row) => ({
    ...rowToProjectService(row),
    service: rowToService({
      id: row.service_id,
      name: row.name,
      hourEstimate: row.hourEstimate,
      hourlyRate: row.hourlyRate,
      type: row.type,
      createdAt: row.service_createdAt,
      updatedAt: row.service_updatedAt,
    }),
  }))
}

export type AddProjectServiceResult =
  | ProjectServiceWithDetails
  | "project_not_found"
  | "service_not_found"
  | "already_linked"

export function addProjectService(
  projectId: string,
  serviceId: string,
  quantity = 1,
): AddProjectServiceResult {
  return withTransaction(() => {
    if (!getProject(projectId)) {
      return "project_not_found"
    }

    const service = getService(serviceId)
    if (!service) {
      return "service_not_found"
    }

    const existing = getDb()
      .prepare(
        "SELECT id FROM project_services WHERE projectId = ? AND serviceId = ?",
      )
      .get(projectId, serviceId) as { id: string } | undefined

    if (existing) {
      return "already_linked"
    }

    const now = new Date().toISOString()
    const projectService: ProjectService = {
      id: randomUUID(),
      projectId,
      serviceId,
      quantity,
      overrideHours: null,
      createdAt: now,
    }

    getDb()
      .prepare(
        `INSERT INTO project_services (
          id, projectId, serviceId, quantity, overrideHours, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        projectService.id,
        projectService.projectId,
        projectService.serviceId,
        projectService.quantity,
        projectService.overrideHours,
        projectService.createdAt,
      )

    return {
      ...projectService,
      service,
    }
  })
}

export function removeProjectService(
  projectId: string,
  serviceId: string,
): "removed" | "not_found" {
  return withTransaction(() => {
    const result = getDb()
      .prepare(
        "DELETE FROM project_services WHERE projectId = ? AND serviceId = ?",
      )
      .run(projectId, serviceId)

    return result.changes > 0 ? "removed" : "not_found"
  })
}

export type UpdateProjectServiceResult =
  | ProjectServiceWithDetails
  | "not_found"

export function updateProjectService(
  projectId: string,
  serviceId: string,
  input: { overrideHours: number | null },
): UpdateProjectServiceResult {
  return withTransaction(() => {
    const existing = getDb()
      .prepare(
        "SELECT id FROM project_services WHERE projectId = ? AND serviceId = ?",
      )
      .get(projectId, serviceId) as { id: string } | undefined

    if (!existing) {
      return "not_found"
    }

    getDb()
      .prepare(
        "UPDATE project_services SET overrideHours = ? WHERE projectId = ? AND serviceId = ?",
      )
      .run(input.overrideHours, projectId, serviceId)

    const updated = listProjectServices(projectId).find(
      (item) => item.serviceId === serviceId,
    )

    if (!updated) {
      return "not_found"
    }

    return updated
  })
}

/** @internal Associates a catalog service with a project (for quoting/budget). */
export function linkServiceToProject(
  projectId: string,
  serviceId: string,
): void {
  const result = addProjectService(projectId, serviceId)
  if (result === "project_not_found" || result === "service_not_found") {
    throw new Error(`Cannot link service ${serviceId} to project ${projectId}`)
  }
  if (result === "already_linked") {
    return
  }
}

function rowToInvoice(row: InvoiceRow): Invoice {
  const lineItems = JSON.parse(row.lineItems) as InvoiceLineItem[]

  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    projectId: row.projectId,
    clientId: row.clientId,
    projectName: row.projectName,
    clientName: row.clientName,
    ...(row.clientCompany ? { clientCompany: row.clientCompany } : {}),
    clientEmail: row.clientEmail,
    currency: row.currency,
    grandTotal: row.grandTotal,
    lineItems,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    status: row.status as Invoice["status"],
    createdAt: row.createdAt,
  }
}

function rowToInvoicePayment(row: InvoicePaymentRow): InvoicePayment {
  const payment: InvoicePayment = {
    id: row.id,
    invoiceId: row.invoiceId,
    amount: row.amount,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
  }

  if (row.notes) {
    payment.notes = row.notes
  }

  return payment
}

function getInvoiceAmountPaid(invoiceId: string): number {
  const row = getDb()
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) AS totalPaid FROM invoice_payments WHERE invoiceId = ?",
    )
    .get(invoiceId) as { totalPaid: number }

  return row.totalPaid
}

function enrichInvoiceSummary(invoice: Invoice): InvoiceSummary {
  const amountPaid = getInvoiceAmountPaid(invoice.id)
  const outstandingBalance = computeOutstandingBalance(
    invoice.grandTotal,
    amountPaid,
  )
  const status = computeInvoiceStatus(invoice.grandTotal, amountPaid)

  return {
    ...invoice,
    status,
    amountPaid,
    outstandingBalance,
    isOverdue: isInvoiceOverdue(invoice.dueDate, status),
  }
}

function syncInvoiceStatus(invoiceId: string): void {
  const invoice = getInvoice(invoiceId)
  if (!invoice) {
    return
  }

  const amountPaid = getInvoiceAmountPaid(invoiceId)
  const status = computeInvoiceStatus(invoice.grandTotal, amountPaid)

  getDb()
    .prepare("UPDATE invoices SET status = ? WHERE id = ?")
    .run(status, invoiceId)
}

function nextInvoiceNumber(db: Database): number {
  const row = db
    .prepare("SELECT COALESCE(MAX(invoiceNumber), 0) AS maxNum FROM invoices")
    .get() as { maxNum: number }
  return row.maxNum + 1
}

export function listInvoicesByProject(projectId: string): InvoiceSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM invoices
       WHERE projectId = ?
       ORDER BY invoiceNumber DESC`,
    )
    .all(projectId) as InvoiceRow[]

  return rows.map((row) => enrichInvoiceSummary(rowToInvoice(row)))
}

export function getInvoice(id: string): Invoice | undefined {
  const row = getDb()
    .prepare("SELECT * FROM invoices WHERE id = ?")
    .get(id) as InvoiceRow | undefined

  return row ? rowToInvoice(row) : undefined
}

export function getInvoiceWithPayments(
  id: string,
): InvoiceWithPayments | undefined {
  const invoice = getInvoice(id)
  if (!invoice) {
    return undefined
  }

  const payments = listInvoicePayments(id)
  const summary = enrichInvoiceSummary(invoice)

  return {
    ...summary,
    payments,
  }
}

export function listInvoicePayments(invoiceId: string): InvoicePayment[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM invoice_payments
       WHERE invoiceId = ?
       ORDER BY paidAt DESC, createdAt DESC`,
    )
    .all(invoiceId) as InvoicePaymentRow[]

  return rows.map(rowToInvoicePayment)
}

export function getProjectOutstandingBalance(projectId: string): number {
  const invoices = listInvoicesByProject(projectId)
  return invoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0)
}

export function getClientOutstandingBalance(clientId: string): number {
  const projects = listProjectsByClientId(clientId)
  return projects.reduce(
    (sum, project) => sum + getProjectOutstandingBalance(project.id),
    0,
  )
}

export type CreateInvoiceResult =
  | InvoiceSummary
  | "project_not_found"
  | "no_client"
  | "no_services"

export function createInvoice(projectId: string): CreateInvoiceResult {
  const project = getProjectWithClient(projectId)
  if (!project) {
    return "project_not_found"
  }

  if (!project.clientId || !project.client) {
    return "no_client"
  }

  const services = listProjectServices(projectId)
  if (services.length === 0) {
    return "no_services"
  }

  const lineItems: InvoiceLineItem[] = services.map((item) => ({
    serviceName: item.service.name,
    hours: effectiveProjectServiceHours(item),
    hourlyRate: item.service.hourlyRate,
    lineTotal: projectServiceLineTotal(item),
  }))

  const grandTotal = calculateProjectServicesEstimate(services)
  const currency = project.budget?.currency ?? "USD"
  const now = new Date()
  const invoiceDate = now.toISOString().slice(0, 10)
  const dueDate = addDaysToIsoDate(invoiceDate, 30)
  const createdAt = now.toISOString()
  const client = project.client

  return withTransaction(() => {
    const db = getDb()
    const id = randomUUID()
    const invoiceNumber = nextInvoiceNumber(db)

    db.prepare(
      `INSERT INTO invoices (
        id, invoiceNumber, projectId, clientId, projectName,
        clientName, clientCompany, clientEmail, currency,
        grandTotal, lineItems, invoiceDate, dueDate, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      invoiceNumber,
      projectId,
      project.clientId,
      project.name,
      client.name,
      client.company ?? null,
      client.email,
      currency,
      grandTotal,
      JSON.stringify(lineItems),
      invoiceDate,
      dueDate,
      "unpaid",
      createdAt,
    )

    const row = db
      .prepare("SELECT * FROM invoices WHERE id = ?")
      .get(id) as InvoiceRow

    return enrichInvoiceSummary(rowToInvoice(row))
  })
}

export function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
): InvoiceSummary | undefined {
  return withTransaction(() => {
    const invoice = getInvoice(id)
    if (!invoice) {
      return undefined
    }

    if (input.dueDate !== undefined) {
      getDb()
        .prepare("UPDATE invoices SET dueDate = ? WHERE id = ?")
        .run(input.dueDate, id)
    }

    const updated = getInvoice(id)
    return updated ? enrichInvoiceSummary(updated) : undefined
  })
}

export function createInvoicePayment(
  input: CreateInvoicePaymentInput,
): InvoicePayment | "invoice_not_found" {
  return withTransaction(() => {
    const invoice = getInvoice(input.invoiceId)
    if (!invoice) {
      return "invoice_not_found"
    }

    const now = new Date().toISOString()
    const payment: InvoicePayment = {
      id: randomUUID(),
      invoiceId: input.invoiceId,
      amount: input.amount,
      paidAt: input.paidAt,
      createdAt: now,
      ...(input.notes ? { notes: input.notes } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO invoice_payments (
          id, invoiceId, amount, paidAt, notes, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        payment.id,
        payment.invoiceId,
        payment.amount,
        payment.paidAt,
        payment.notes ?? null,
        payment.createdAt,
      )

    syncInvoiceStatus(input.invoiceId)
    return payment
  })
}
