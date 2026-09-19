import { AsyncLocalStorage } from "node:async_hooks"
import fs from "node:fs"
import path from "node:path"
import type { Request as ExpressRequest } from "express"
import { Server, type Upload } from "@tus/server"
import { FileStore } from "@tus/file-store"
import { config, getMaxUploadSizeBytes } from "../config/env.js"
import { getUploadDir } from "../config/paths.js"
import { getDeliverable, getVersionByLabel, createVersion } from "../storage/index.js"
import type { UploadResponse } from "../types/upload.js"
import { resolveDeliverableStudioId } from "../auth/studio-scope.js"
import { removeStaleVersionFile } from "../routes/upload-cleanup.js"

const TUS_API_PATH = "/api/uploads/tus"
const TUS_STAGING_DIR = ".tus-staging"

const REQUIRED_METADATA_KEYS = ["deliverableId", "version", "filename", "filetype"] as const
const uploadRequestContext = new AsyncLocalStorage<ExpressRequest>()

type VersionUploadMetadata = Record<(typeof REQUIRED_METADATA_KEYS)[number], string>

function getTusStagingDirectory(): string {
  const directory = path.join(config.uploadDir, TUS_STAGING_DIR)
  fs.mkdirSync(directory, { recursive: true })
  return directory
}

export function sanitizeUploadFilename(originalName: string): string {
  const ext = path.extname(originalName)
  const base = path.basename(originalName, ext)
  const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `${safeBase}${ext}`
}

export async function runWithUploadRequestContext<T>(
  request: ExpressRequest,
  run: () => Promise<T>,
): Promise<T> {
  return uploadRequestContext.run(request, run)
}

function getExpressRequest(): ExpressRequest {
  const request = uploadRequestContext.getStore()
  if (!request) {
    throw {
      status_code: 500,
      body: JSON.stringify({ error: "Upload request context is unavailable." }),
    }
  }

  return request
}

function getStudioId(request: ExpressRequest): string | null {
  return request.currentSession?.studio.id ?? null
}

function assertVersionUploadMetadata(
  metadata: Upload["metadata"] | undefined,
): VersionUploadMetadata {
  const values = metadata ?? {}
  const missing = REQUIRED_METADATA_KEYS.filter((key) => !values[key]?.trim())
  if (missing.length > 0) {
    throw {
      status_code: 400,
      body: JSON.stringify({
        error: `Missing Upload-Metadata fields: ${missing.join(", ")}`,
      }),
    }
  }

  const filetype = values.filetype!.trim()
  if (!filetype.startsWith("video/")) {
    throw {
      status_code: 400,
      body: JSON.stringify({ error: "Only video files are allowed." }),
    }
  }

  return {
    deliverableId: values.deliverableId!.trim(),
    version: values.version!.trim(),
    filename: values.filename!.trim(),
    filetype,
  }
}

function assertDeliverableAccess(
  request: ExpressRequest,
  deliverableId: string,
): { projectId: string } {
  const studioId = getStudioId(request)
  if (!studioId) {
    throw {
      status_code: 401,
      body: JSON.stringify({ error: "Sign in required." }),
    }
  }

  const deliverable = getDeliverable(deliverableId)
  if (!deliverable) {
    throw {
      status_code: 404,
      body: JSON.stringify({ error: `Deliverable '${deliverableId}' not found` }),
    }
  }

  const deliverableStudioId = resolveDeliverableStudioId(deliverableId)
  if (!deliverableStudioId || deliverableStudioId !== studioId) {
    throw {
      status_code: 403,
      body: JSON.stringify({ error: "You don't have permission to do that." }),
    }
  }

  return { projectId: deliverable.projectId }
}

function getStagingFilePath(uploadId: string): string {
  return path.join(getTusStagingDirectory(), uploadId)
}

function finalizeVersionUpload(
  metadata: VersionUploadMetadata,
  upload: Upload,
): UploadResponse {
  const deliverable = getDeliverable(metadata.deliverableId)
  if (!deliverable) {
    throw new Error(`Deliverable '${metadata.deliverableId}' not found`)
  }

  const projectId = deliverable.projectId

  const safeFilename = sanitizeUploadFilename(metadata.filename)
  const destinationDir = getUploadDir(projectId, metadata.deliverableId, metadata.version)
  fs.mkdirSync(destinationDir, { recursive: true })
  const destinationPath = path.join(destinationDir, safeFilename)
  const stagingPath = getStagingFilePath(upload.id)

  if (!fs.existsSync(stagingPath)) {
    throw new Error("Uploaded file is missing from staging storage.")
  }

  const existingVersion = getVersionByLabel(metadata.deliverableId, metadata.version)
  const previousFilename = existingVersion?.filename

  try {
    fs.renameSync(stagingPath, destinationPath)
  } catch {
    fs.copyFileSync(stagingPath, destinationPath)
    fs.unlinkSync(stagingPath)
  }

  let version
  try {
    version = createVersion({
      projectId,
      deliverableId: metadata.deliverableId,
      label: metadata.version,
      filename: safeFilename,
    })
  } catch (error) {
    try {
      if (fs.existsSync(destinationPath)) {
        fs.unlinkSync(destinationPath)
      }
    } catch {
      // Best-effort cleanup.
    }
    throw error
  }

  if (previousFilename && previousFilename !== safeFilename) {
    removeStaleVersionFile(
      projectId,
      metadata.deliverableId,
      metadata.version,
      previousFilename,
    )
  }

  const size = upload.size ?? fs.statSync(destinationPath).size

  return {
    filename: safeFilename,
    size,
    duration: null,
    projectId,
    deliverableId: metadata.deliverableId,
    version: metadata.version,
    versionId: version.id,
  }
}

let cachedVersionUploadServer: Server | null = null
let cachedStagingDir: string | null = null

export function getVersionUploadTusServer(): Server {
  const stagingDir = getTusStagingDirectory()
  if (!cachedVersionUploadServer || cachedStagingDir !== stagingDir) {
    cachedVersionUploadServer = createVersionUploadServer()
    cachedStagingDir = stagingDir
  }

  return cachedVersionUploadServer
}

export function resetVersionUploadTusServerForTests(): void {
  cachedVersionUploadServer = null
  cachedStagingDir = null
}

function createVersionUploadServer(): Server {
  const datastore = new FileStore({ directory: getTusStagingDirectory() })

  return new Server({
    path: TUS_API_PATH,
    datastore,
    maxSize: getMaxUploadSizeBytes(),
    respectForwardedHeaders: true,
    relativeLocation: true,
    allowedCredentials: true,
    allowedHeaders: ["Authorization", "X-CSRF-Token"],
    exposedHeaders: ["X-Playblast-Upload-Result"],
    async onUploadCreate(_request, upload) {
      const expressRequest = getExpressRequest()
      const metadata = assertVersionUploadMetadata(upload.metadata)
      assertDeliverableAccess(expressRequest, metadata.deliverableId)
      return { metadata }
    },
    async onUploadFinish(_request, upload) {
      const expressRequest = getExpressRequest()
      const metadata = assertVersionUploadMetadata(upload.metadata)
      assertDeliverableAccess(expressRequest, metadata.deliverableId)

      let response: UploadResponse
      try {
        response = finalizeVersionUpload(metadata, upload)
      } catch {
        const stagingPath = getStagingFilePath(upload.id)
        try {
          if (fs.existsSync(stagingPath)) {
            fs.unlinkSync(stagingPath)
          }
        } catch {
          // Best-effort cleanup.
        }
        throw {
          status_code: 500,
          body: JSON.stringify({ error: "Failed to save uploaded version." }),
        }
      }

      try {
        await datastore.remove(upload.id)
      } catch {
        // Version metadata is already persisted; stale tus records are harmless.
      }

      const body = JSON.stringify(response)
      return {
        status_code: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Playblast-Upload-Result": body,
        },
        body,
      }
    },
  })
}

export const VERSION_UPLOAD_TUS_PATH = TUS_API_PATH
