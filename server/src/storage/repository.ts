import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import type { Database } from "better-sqlite3"
import { getUploadDir } from "../config/paths.js"
import type {
  Comment,
  CreateCommentInput,
  CreateDeliverableInput,
  CreateMilestoneInput,
  CreateProjectInput,
  CreateVersionInput,
  Deliverable,
  DeliverableStatus,
  DeliverableSummary,
  Milestone,
  Project,
  ProjectBudget,
  ProjectStatus,
  ProjectSummary,
  UpdateCommentInput,
  UpdateDeliverableInput,
  UpdateMilestoneInput,
  UpdateProjectInput,
  Version,
  VersionStatus,
} from "../types/index.js"
import { DELIVERABLE_STATUSES } from "../types/index.js"
import type { FrameAnnotation } from "../types/annotation.js"
import { getDb, withTransaction } from "./db.js"

interface ProjectRow {
  id: string
  name: string
  createdAt: string
  status: string
  client: string | null
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

export function listProjectSummaries(): ProjectSummary[] {
  const db = getDb()
  const projects = listProjects()

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
    }
  })
}

export function getProject(id: string): Project | undefined {
  const row = getDb()
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as ProjectRow | undefined

  return row ? rowToProject(row) : undefined
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
      ...(input.description ? { description: input.description } : {}),
      ...(input.startDate ? { startDate: input.startDate } : {}),
      ...(input.endDate ? { endDate: input.endDate } : {}),
      ...(input.budget ? { budget: input.budget } : {}),
    }

    getDb()
      .prepare(
        `INSERT INTO projects (
          id, name, createdAt, status, client, description, startDate, endDate, budget
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        project.id,
        project.name,
        project.createdAt,
        project.status,
        project.client ?? null,
        project.description ?? null,
        project.startDate ?? null,
        project.endDate ?? null,
        project.budget ? JSON.stringify(project.budget) : null,
      )

    return project
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
         SET name = ?, status = ?, client = ?, description = ?,
             startDate = ?, endDate = ?, budget = ?
         WHERE id = ?`,
      )
      .run(
        project.name,
        project.status,
        project.client ?? null,
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
