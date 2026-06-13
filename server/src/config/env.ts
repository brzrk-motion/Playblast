import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "../../..")

dotenv.config({ path: path.join(REPO_ROOT, ".env") })

const DEFAULT_PORT = 3000
const DEFAULT_UPLOAD_DIR = "/app/uploads"
const DEFAULT_DB_PATH = "/app/data/playblast.db"
const DEFAULT_MAX_UPLOAD_SIZE_MB = 5000

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`)
  }

  return port
}

function parseMaxUploadSizeMb(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback
  }

  const sizeMb = Number(value)
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) {
    throw new Error(`Invalid MAX_UPLOAD_SIZE value: ${value}`)
  }

  return sizeMb
}

function parseNodeEnv(value: string | undefined): "production" | "development" {
  if (value === "production" || value === "development") {
    return value
  }

  return "development"
}

export const config = {
  get port(): number {
    return parsePort(process.env.PORT, DEFAULT_PORT)
  },
  get uploadDir(): string {
    return path.resolve(process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR)
  },
  get dbPath(): string {
    return path.resolve(process.env.DB_PATH ?? DEFAULT_DB_PATH)
  },
  get maxUploadSizeMb(): number {
    return parseMaxUploadSizeMb(
      process.env.MAX_UPLOAD_SIZE,
      DEFAULT_MAX_UPLOAD_SIZE_MB,
    )
  },
  get nodeEnv(): "production" | "development" {
    return parseNodeEnv(process.env.NODE_ENV)
  },
}

export function getMaxUploadSizeBytes(): number {
  return config.maxUploadSizeMb * 1024 * 1024
}

export const isProduction = (): boolean => config.nodeEnv === "production"
