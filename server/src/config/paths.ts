import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "./env.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const SERVER_ROOT = path.resolve(__dirname, "../..")

export const CLIENT_DIST = path.resolve(SERVER_ROOT, "../client/dist")

export function ensureUploadDir(): string {
  const uploadDir = config.uploadDir
  fs.mkdirSync(uploadDir, { recursive: true })
  return uploadDir
}

export function getProjectUploadDir(projectId: string): string {
  return path.join(config.uploadDir, projectId)
}

export function getDeliverableUploadDir(
  projectId: string,
  deliverableId: string,
): string {
  return path.join(getProjectUploadDir(projectId), deliverableId)
}

export function getUploadDir(
  projectId: string,
  deliverableId: string,
  version: string,
): string {
  return path.join(getDeliverableUploadDir(projectId, deliverableId), version)
}

export function getVideoPath(
  projectId: string,
  deliverableId: string,
  version: string,
  filename: string,
): string | null {
  const uploadDir = path.resolve(getUploadDir(projectId, deliverableId, version))
  const resolvedPath = path.resolve(uploadDir, filename)

  if (
    resolvedPath !== uploadDir &&
    !resolvedPath.startsWith(`${uploadDir}${path.sep}`)
  ) {
    return null
  }

  return resolvedPath
}
