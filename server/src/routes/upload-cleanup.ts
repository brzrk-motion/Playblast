import fs from "node:fs"
import path from "node:path"
import type { Express } from "express"
import { getVideoPath } from "../config/paths.js"

export function removeUploadedFile(file: Express.Multer.File | undefined): void {
  if (!file?.path) {
    return
  }

  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }
  } catch {
    // Best-effort cleanup; orphaned files are preferable to failed uploads leaving metadata.
  }
}

export function removeStaleVersionFile(
  projectId: string,
  deliverableId: string,
  versionLabel: string,
  filename: string,
): void {
  const filePath = getVideoPath(projectId, deliverableId, versionLabel, filename)
  if (!filePath) {
    return
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // Best-effort cleanup after successful re-upload.
  }
}

export function uploadedFilePath(file: Express.Multer.File): string {
  return path.resolve(file.destination, file.filename)
}
