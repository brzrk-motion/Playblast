import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export interface E2ERuntimeState {
  baseUrl: string
  port: number
  tempDir: string
  dbPath: string
  uploadDir: string
  smtpCaptureDir: string
  serverPid: number
  mode: "local"
  composeProject?: string
}

export function runtimeStatePath(): string {
  return path.join(e2eRoot, ".runtime", "state.json")
}

export function authDir(): string {
  return path.join(e2eRoot, ".runtime", "auth")
}

export function readRuntimeState(): E2ERuntimeState {
  const file = runtimeStatePath()
  if (!fs.existsSync(file)) {
    throw new Error(`E2E runtime state missing at ${file}`)
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as E2ERuntimeState
}

export function writeRuntimeState(state: E2ERuntimeState): void {
  const file = runtimeStatePath()
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  fs.writeFileSync(file, JSON.stringify(state, null, 2), { mode: 0o600 })
  fs.chmodSync(file, 0o600)
}
