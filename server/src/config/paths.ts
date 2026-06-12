import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const SERVER_ROOT = path.resolve(__dirname, "../..")

export function getUploadDir(projectId: string, version: string): string {
  return path.join(SERVER_ROOT, "uploads", projectId, version)
}
