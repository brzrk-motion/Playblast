import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { spawn, type ChildProcess } from "node:child_process"
import { fileURLToPath } from "node:url"
import {
  writeRuntimeState,
  runtimeStatePath,
  authDir,
  type E2ERuntimeState,
} from "./helpers/runtime.js"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function assertPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = net.createServer()
    server.once("error", (error) => {
      reject(
        new Error(
          `E2E port ${port} is unavailable (${error.message}). Stop the other process or set PLAYBLAST_E2E_PORT.`,
        ),
      )
    })
    server.once("listening", () => {
      server.close(() => resolve())
    })
    server.listen(port, "127.0.0.1")
  })
}

async function waitForOwnedHealth(
  baseUrl: string,
  expectedDbPath: string,
  pid: number,
  timeoutMs = 60_000,
): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (pid && !isPidAlive(pid)) {
      throw new Error("E2E server exited before becoming healthy")
    }
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) {
        const body = (await response.json()) as {
          status?: string
          storage?: { dbPath?: string }
        }
        if (
          body.status === "ok" &&
          body.storage?.dbPath &&
          path.resolve(body.storage.dbPath) === path.resolve(expectedDbPath)
        ) {
          return
        }
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`E2E server did not become healthy at ${baseUrl}`)
}

function pickPort(): number {
  const fromEnv = Number(process.env.PLAYBLAST_E2E_PORT)
  if (Number.isInteger(fromEnv) && fromEnv > 0) {
    return fromEnv
  }
  return 3199
}

export default async function globalSetup(): Promise<void> {
  const port = pickPort()
  const baseUrl = `http://127.0.0.1:${port}`
  await assertPortAvailable(port)

  const runtimeDir = path.dirname(runtimeStatePath())
  fs.rmSync(runtimeDir, { recursive: true, force: true })

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-e2e-"))
  const dbPath = path.join(tempDir, "playblast.db")
  const uploadDir = path.join(tempDir, "uploads")
  const smtpCaptureDir = path.join(tempDir, "smtp-capture")
  fs.mkdirSync(uploadDir, { recursive: true })
  fs.mkdirSync(smtpCaptureDir, { recursive: true })
  fs.mkdirSync(authDir(), { recursive: true, mode: 0o700 })

  const serverEntry = path.join(repoRoot, "server/dist/e2e-entry.js")
  if (!fs.existsSync(serverEntry)) {
    throw new Error("server/dist/e2e-entry.js missing; run production build before E2E")
  }

  const child: ChildProcess = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      DB_PATH: dbPath,
      UPLOAD_DIR: uploadDir,
      SESSION_SECRET: "e2e-local-session-secret-32chars-min",
      PLAYBLAST_E2E_TEST_MODE: "1",
      PLAYBLAST_SMTP_CAPTURE_DIR: smtpCaptureDir,
      PLAYBLAST_EMERGENCY_BASIC_AUTH: "false",
      PLAYBLAST_E2E_RELAX_RATE_LIMITS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  })

  if (!child.pid) {
    throw new Error("Failed to start E2E server process")
  }

  const logPath = path.join(tempDir, "server.log")
  const logStream = fs.createWriteStream(logPath, { flags: "a" })
  child.stdout?.pipe(logStream)
  child.stderr?.pipe(logStream)

  try {
    await waitForOwnedHealth(baseUrl, dbPath, child.pid)
    const setupStatus = await fetch(`${baseUrl}/api/setup/status`)
    const setupBody = (await setupStatus.json()) as { status?: string }
    if (setupBody.status !== "pending") {
      throw new Error(
        `E2E server at ${baseUrl} is not a clean install (setup status=${setupBody.status}).`,
      )
    }
  } catch (error) {
    try {
      process.kill(-child.pid, "SIGTERM")
    } catch {
      // ignore
    }
    const stoppedAt = Date.now()
    while (isPidAlive(child.pid) && Date.now() - stoppedAt < 5_000) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (isPidAlive(child.pid)) {
      try {
        process.kill(-child.pid, "SIGKILL")
      } catch {
        // ignore
      }
    }
    await new Promise<void>((resolve) => logStream.end(() => resolve()))
    fs.rmSync(tempDir, { recursive: true, force: true })
    fs.rmSync(runtimeDir, { recursive: true, force: true })
    throw error
  }

  const state: E2ERuntimeState = {
    baseUrl,
    port,
    tempDir,
    dbPath,
    uploadDir,
    smtpCaptureDir,
    serverPid: child.pid,
    mode: "local",
  }
  writeRuntimeState(state)

  child.unref()
}
