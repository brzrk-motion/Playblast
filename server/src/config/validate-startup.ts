import fs from "node:fs"
import path from "node:path"
import { authConfig } from "../auth/config.js"
import { config, isProduction } from "./env.js"

export type StartupValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

function ensureWritableDirectory(dirPath: string, label: string): void {
  fs.mkdirSync(dirPath, { recursive: true })

  const probe = pathJoinSafe(dirPath, `.playblast-write-probe-${process.pid}`)
  try {
    fs.writeFileSync(probe, "ok", { flag: "wx" })
    fs.unlinkSync(probe)
  } catch {
    throw new Error(`${label} is not writable: ${dirPath}`)
  }
}

function pathJoinSafe(base: string, segment: string): string {
  return path.join(base, segment)
}

/**
 * Validate production configuration before binding the HTTP listener.
 * Never logs secret values.
 */
export function validateStartup(): StartupValidationResult {
  try {
    if (isProduction()) {
      void authConfig.sessionSecret
    }

    if (
      authConfig.emergencyBasicAuthEnabled &&
      (!authConfig.emergencyBasicAuthUser || !authConfig.emergencyBasicAuthPassword)
    ) {
      return {
        ok: false,
        code: "EMERGENCY_BASIC_AUTH_INCOMPLETE",
        message:
          "PLAYBLAST_EMERGENCY_BASIC_AUTH is enabled but PLAYBLAST_AUTH_USER and PLAYBLAST_AUTH_PASSWORD are not both set.",
      }
    }

    ensureWritableDirectory(config.uploadDir, "UPLOAD_DIR")
    ensureWritableDirectory(path.dirname(config.dbPath), "DB_PATH parent directory")

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid configuration."
    const code = message.includes("SESSION_SECRET")
      ? "SESSION_SECRET_INVALID"
      : message.includes("writable")
        ? "STORAGE_NOT_WRITABLE"
        : "CONFIG_INVALID"

    return { ok: false, code, message }
  }
}
