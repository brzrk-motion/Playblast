import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { EMPTY_STORE, type DataStore } from "../types/store.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = path.resolve(__dirname, "../../data")
const STORE_FILENAME = "store.json"

export function getDataDir(): string {
  return process.env.PLAYBLAST_DATA_DIR ?? DEFAULT_DATA_DIR
}

export function getStorePath(): string {
  return path.join(getDataDir(), STORE_FILENAME)
}

function isDataStore(value: unknown): value is DataStore {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    Array.isArray(record.projects) &&
    Array.isArray(record.versions) &&
    Array.isArray(record.comments)
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

  return parsed
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
