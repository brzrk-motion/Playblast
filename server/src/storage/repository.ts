import { randomUUID } from "node:crypto"
import type {
  Comment,
  CreateCommentInput,
  CreateProjectInput,
  CreateVersionInput,
  Project,
  UpdateCommentInput,
  Version,
} from "../types/index.js"
import { readStore, withStore } from "./json-store.js"

export function listProjects(): Project[] {
  return readStore().projects
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
    }

    store.projects.push(project)
    return project
  })
}

export function ensureProject(id: string, name?: string): Project {
  const existing = getProject(id)
  if (existing) {
    return existing
  }

  return createProject({ id, name: name ?? id })
}

export function listVersions(projectId: string): Version[] {
  return readStore().versions.filter((version) => version.projectId === projectId)
}

export function getVersion(id: string): Version | undefined {
  return readStore().versions.find((version) => version.id === id)
}

export function getVersionByLabel(
  projectId: string,
  label: string,
): Version | undefined {
  return readStore().versions.find(
    (version) => version.projectId === projectId && version.label === label,
  )
}

export function createVersion(input: CreateVersionInput): Version {
  return withStore((store) => {
    const existing = store.versions.find(
      (version) =>
        version.projectId === input.projectId && version.label === input.label,
    )

    if (existing) {
      existing.filename = input.filename
      existing.uploadedAt = new Date().toISOString()
      return existing
    }

    const version: Version = {
      id: randomUUID(),
      projectId: input.projectId,
      label: input.label,
      filename: input.filename,
      uploadedAt: new Date().toISOString(),
    }

    store.versions.push(version)
    return version
  })
}

export function listComments(versionId: string): Comment[] {
  return readStore().comments.filter(
    (comment) => comment.versionId === versionId,
  )
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
