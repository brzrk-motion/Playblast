import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
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
  ProjectSummary,
  UpdateCommentInput,
  UpdateDeliverableInput,
  UpdateMilestoneInput,
  UpdateProjectInput,
  Version,
  VersionStatus,
} from "../types/index.js"
import { DELIVERABLE_STATUSES } from "../types/index.js"
import { readStore, withStore } from "./json-store.js"

function emptyStatusCounts(): Record<DeliverableStatus, number> {
  return DELIVERABLE_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0
      return acc
    },
    {} as Record<DeliverableStatus, number>,
  )
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

// --- Projects ---------------------------------------------------------------

export function listProjects(): Project[] {
  return readStore().projects
}

export function listProjectSummaries(): ProjectSummary[] {
  const store = readStore()

  return store.projects.map((project) => {
    const deliverables = store.deliverables.filter(
      (deliverable) => deliverable.projectId === project.id,
    )
    const deliverableIds = new Set(deliverables.map((item) => item.id))
    const versions = store.versions.filter((version) =>
      deliverableIds.has(version.deliverableId),
    )
    const versionIds = new Set(versions.map((version) => version.id))
    const openCommentCount = store.comments.filter(
      (comment) => versionIds.has(comment.versionId) && !comment.resolved,
    ).length

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

    const nextMilestone = store.milestones
      .filter((milestone) => milestone.projectId === project.id && !milestone.done)
      .sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })[0]

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
  return readStore().projects.find((project) => project.id === id)
}

export function createProject(input: CreateProjectInput): Project {
  return withStore((store) => {
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

    store.projects.push(project)
    return project
  })
}

export function updateProject(
  id: string,
  input: UpdateProjectInput,
): Project | undefined {
  return withStore((store) => {
    const project = store.projects.find((item) => item.id === id)
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
  return withStore((store) => {
    const index = store.projects.findIndex((project) => project.id === id)

    if (index === -1) {
      return false
    }

    const deliverableIds = new Set(
      store.deliverables
        .filter((deliverable) => deliverable.projectId === id)
        .map((deliverable) => deliverable.id),
    )
    const versionIds = new Set(
      store.versions
        .filter((version) => deliverableIds.has(version.deliverableId))
        .map((version) => version.id),
    )

    store.comments = store.comments.filter(
      (comment) => !versionIds.has(comment.versionId),
    )
    store.versions = store.versions.filter(
      (version) => !deliverableIds.has(version.deliverableId),
    )
    store.deliverables = store.deliverables.filter(
      (deliverable) => deliverable.projectId !== id,
    )
    store.milestones = store.milestones.filter(
      (milestone) => milestone.projectId !== id,
    )
    store.projects.splice(index, 1)
    return true
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
  return readStore()
    .deliverables.filter((deliverable) => deliverable.projectId === projectId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
}

export function listDeliverableSummaries(projectId: string): DeliverableSummary[] {
  const store = readStore()
  const deliverables = store.deliverables
    .filter((deliverable) => deliverable.projectId === projectId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))

  return deliverables.map((deliverable) => {
    const versions = store.versions.filter(
      (version) => version.deliverableId === deliverable.id,
    )
    const versionIds = new Set(versions.map((version) => version.id))
    const openCommentCount = store.comments.filter(
      (comment) => versionIds.has(comment.versionId) && !comment.resolved,
    ).length
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
  return readStore().deliverables.find((deliverable) => deliverable.id === id)
}

export function createDeliverable(input: CreateDeliverableInput): Deliverable {
  return withStore((store) => {
    const siblings = store.deliverables.filter(
      (deliverable) => deliverable.projectId === input.projectId,
    )
    const order =
      siblings.reduce((max, item) => Math.max(max, item.order), -1) + 1

    const deliverable: Deliverable = {
      id: randomUUID(),
      projectId: input.projectId,
      name: input.name,
      status: input.status ?? "not_started",
      createdAt: new Date().toISOString(),
      order,
      ...(input.description ? { description: input.description } : {}),
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    }

    store.deliverables.push(deliverable)
    return deliverable
  })
}

export function updateDeliverable(
  id: string,
  input: UpdateDeliverableInput,
): Deliverable | undefined {
  return withStore((store) => {
    const deliverable = store.deliverables.find((item) => item.id === id)
    if (!deliverable) {
      return undefined
    }

    if (input.name !== undefined) deliverable.name = input.name
    if (input.status !== undefined) deliverable.status = input.status

    applyNullableString(deliverable, "description", input.description)
    applyNullableString(deliverable, "dueDate", input.dueDate)

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
  return withStore((store) => {
    const index = store.deliverables.findIndex(
      (deliverable) => deliverable.id === id,
    )
    if (index === -1) {
      return false
    }

    const versionIds = new Set(
      store.versions
        .filter((version) => version.deliverableId === id)
        .map((version) => version.id),
    )

    store.comments = store.comments.filter(
      (comment) => !versionIds.has(comment.versionId),
    )
    store.versions = store.versions.filter(
      (version) => version.deliverableId !== id,
    )
    store.deliverables.splice(index, 1)
    return true
  })
}

// --- Milestones -------------------------------------------------------------

export function listMilestones(projectId: string): Milestone[] {
  return readStore()
    .milestones.filter((milestone) => milestone.projectId === projectId)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return a.order - b.order
    })
}

export function getMilestone(id: string): Milestone | undefined {
  return readStore().milestones.find((milestone) => milestone.id === id)
}

export function createMilestone(input: CreateMilestoneInput): Milestone {
  return withStore((store) => {
    const siblings = store.milestones.filter(
      (milestone) => milestone.projectId === input.projectId,
    )
    const order =
      siblings.reduce((max, item) => Math.max(max, item.order), -1) + 1

    const milestone: Milestone = {
      id: randomUUID(),
      projectId: input.projectId,
      name: input.name,
      done: input.done ?? false,
      order,
      createdAt: new Date().toISOString(),
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    }

    store.milestones.push(milestone)
    return milestone
  })
}

export function updateMilestone(
  id: string,
  input: UpdateMilestoneInput,
): Milestone | undefined {
  return withStore((store) => {
    const milestone = store.milestones.find((item) => item.id === id)
    if (!milestone) {
      return undefined
    }

    if (input.name !== undefined) milestone.name = input.name
    if (input.done !== undefined) milestone.done = input.done

    applyNullableString(milestone, "dueDate", input.dueDate)

    return milestone
  })
}

export function deleteMilestone(id: string): boolean {
  return withStore((store) => {
    const index = store.milestones.findIndex((milestone) => milestone.id === id)
    if (index === -1) {
      return false
    }

    store.milestones.splice(index, 1)
    return true
  })
}

// --- Versions ---------------------------------------------------------------

export function listVersions(deliverableId: string): Version[] {
  return readStore()
    .versions.filter((version) => version.deliverableId === deliverableId)
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )
}

export function listVersionsByProject(projectId: string): Version[] {
  return readStore()
    .versions.filter((version) => version.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )
}

export function getVersion(id: string): Version | undefined {
  return readStore().versions.find((version) => version.id === id)
}

export function getVersionByLabel(
  deliverableId: string,
  label: string,
): Version | undefined {
  return readStore().versions.find(
    (version) =>
      version.deliverableId === deliverableId && version.label === label,
  )
}

export function createVersion(input: CreateVersionInput): Version {
  return withStore((store) => {
    const existing = store.versions.find(
      (version) =>
        version.deliverableId === input.deliverableId &&
        version.label === input.label,
    )

    if (existing) {
      existing.filename = input.filename
      existing.uploadedAt = new Date().toISOString()
      existing.status = "pending_review"
      return existing
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

    store.versions.push(version)
    return version
  })
}

export function updateVersionStatus(
  id: string,
  status: VersionStatus,
): Version | undefined {
  return withStore((store) => {
    const version = store.versions.find((item) => item.id === id)

    if (!version) {
      return undefined
    }

    version.status = status
    return version
  })
}

export function updateVersionLabel(
  id: string,
  label: string,
): Version | "not_found" | "conflict" {
  return withStore((store) => {
    const version = store.versions.find((item) => item.id === id)

    if (!version) {
      return "not_found"
    }

    if (version.label === label) {
      return version
    }

    const conflict = store.versions.find(
      (item) =>
        item.deliverableId === version.deliverableId &&
        item.label === label &&
        item.id !== id,
    )

    if (conflict) {
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

    version.label = label
    return version
  })
}

// --- Comments ---------------------------------------------------------------

export function listComments(versionId: string): Comment[] {
  return readStore()
    .comments.filter((comment) => comment.versionId === versionId)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function getComment(id: string): Comment | undefined {
  return readStore().comments.find((comment) => comment.id === id)
}

export function createComment(input: CreateCommentInput): Comment {
  return withStore((store) => {
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

    store.comments.push(comment)
    return comment
  })
}

export function updateComment(
  id: string,
  input: UpdateCommentInput,
): Comment | undefined {
  return withStore((store) => {
    const comment = store.comments.find((item) => item.id === id)

    if (!comment) {
      return undefined
    }

    if (input.body !== undefined) {
      comment.body = input.body
    }

    if (input.resolved !== undefined) {
      comment.resolved = input.resolved
    }

    return comment
  })
}

export function deleteComment(id: string): boolean {
  return withStore((store) => {
    const index = store.comments.findIndex((comment) => comment.id === id)

    if (index === -1) {
      return false
    }

    store.comments.splice(index, 1)
    return true
  })
}
