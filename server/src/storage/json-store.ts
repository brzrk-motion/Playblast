import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { sanitizeStore } from "../lib/store-sanitize.js"
import { EMPTY_STORE, type DataStore } from "../types/store.js"
import type { Version, VersionStatus } from "../types/version.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = path.resolve(__dirname, "../../data")
const STORE_FILENAME = "store.json"

export function getDataDir(): string {
  return process.env.PLAYBLAST_DATA_DIR ?? DEFAULT_DATA_DIR
}

export function getStorePath(): string {
  return path.join(getDataDir(), STORE_FILENAME)
}

function normalizeVersionStatus(status: unknown): VersionStatus {
  if (
    status === "pending_review" ||
    status === "needs_revision" ||
    status === "approved"
  ) {
    return status
  }

  return "pending_review"
}

function normalizeVersion(version: Version): Version {
  return {
    ...version,
    status: normalizeVersionStatus(version.status),
  }
}

function normalizeStore(store: DataStore): DataStore {
  return {
    ...store,
    deliverables: store.deliverables ?? [],
    milestones: store.milestones ?? [],
    versions: store.versions.map(normalizeVersion),
  }
}

function isDataStore(value: unknown): value is DataStore {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    Array.isArray(record.projects) &&
    Array.isArray(record.versions) &&
    Array.isArray(record.comments) &&
    (record.deliverables === undefined || Array.isArray(record.deliverables)) &&
    (record.milestones === undefined || Array.isArray(record.milestones))
  )
}

export function readStore(): DataStore {
  const storePath = getStorePath()

  if (!fs.existsSync(storePath)) {
    return structuredClone(EMPTY_STORE)
  }

  const raw = fs.readFileSync(storePath, "utf8")
  const parsed: unknown = JSON.parse(raw)

  if (!isDataStore(parsed)) {
    throw new Error(`Invalid data store format at ${storePath}`)
  }

  const normalized = normalizeStore(parsed)
  const sanitized = sanitizeStore(normalized)

  if (sanitized.comments.length !== normalized.comments.length) {
    writeStore(sanitized)
  }

  return sanitized
}

export function writeStore(store: DataStore): void {
  const dataDir = getDataDir()
  fs.mkdirSync(dataDir, { recursive: true })

  const storePath = getStorePath()
  const tempPath = `${storePath}.tmp`

  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), "utf8")
  fs.renameSync(tempPath, storePath)
}

export function withStore<T>(mutator: (store: DataStore) => T): T {
  const store = readStore()
  const result = mutator(store)
  writeStore(store)
  return result
}
