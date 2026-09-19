import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { spawn, type ChildProcess } from "node:child_process"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

export interface MailpitE2EServer {
  baseUrl: string
  port: number
  tempDir: string
  serverPid: number
}

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
          `Mailpit E2E port ${port} is unavailable (${error.message}). Set PLAYBLAST_MAILPIT_E2E_PORT.`,
        ),
      )
    })
    server.once("listening", () => {
      server.close(() => resolve())
    })
    server.listen(port, "127.0.0.1")
  })
}

async function waitForHealth(
  baseUrl: string,
  expectedDbPath: string,
  pid: number,
  timeoutMs = 60_000,
): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (pid && !isPidAlive(pid)) {
      throw new Error("Mailpit E2E server exited before becoming healthy")
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
  throw new Error(`Mailpit E2E server did not become healthy at ${baseUrl}`)
}

function pickPort(): number {
  const fromEnv = Number(process.env.PLAYBLAST_MAILPIT_E2E_PORT)
  if (Number.isInteger(fromEnv) && fromEnv > 0) {
    return fromEnv
  }
  return 3200
}

export async function startMailpitE2EServer(): Promise<MailpitE2EServer> {
  const mailpitUrl = process.env.MAILPIT_URL?.trim()
  if (!mailpitUrl) {
    throw new Error("MAILPIT_URL is required to start the Mailpit E2E server")
  }

  const port = pickPort()
  const baseUrl = `http://127.0.0.1:${port}`
  await assertPortAvailable(port)

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-mailpit-e2e-"))
  const dbPath = path.join(tempDir, "playblast.db")
  const uploadDir = path.join(tempDir, "uploads")
  fs.mkdirSync(uploadDir, { recursive: true })

  const serverEntry = path.join(repoRoot, "server/dist/e2e-entry.js")
  if (!fs.existsSync(serverEntry)) {
    throw new Error("server/dist/e2e-entry.js missing; run production build before Mailpit E2E")
  }

  const child: ChildProcess = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: "development",
      MAILPIT_URL: mailpitUrl,
      PLAYBLAST_INSTANCE_URL: baseUrl,
      PORT: String(port),
      DB_PATH: dbPath,
      UPLOAD_DIR: uploadDir,
      SESSION_SECRET: "mailpit-e2e-session-secret-32chars-min",
      PLAYBLAST_E2E_TEST_MODE: "1",
      PLAYBLAST_EMERGENCY_BASIC_AUTH: "false",
      PLAYBLAST_E2E_RELAX_RATE_LIMITS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  })

  if (!child.pid) {
    throw new Error("Failed to start Mailpit E2E server process")
  }

  const logPath = path.join(tempDir, "server.log")
  const logStream = fs.createWriteStream(logPath, { flags: "a" })
  child.stdout?.pipe(logStream)
  child.stderr?.pipe(logStream)

  try {
    await waitForHealth(baseUrl, dbPath, child.pid)
    const setupStatus = await fetch(`${baseUrl}/api/setup/status`)
    const setupBody = (await setupStatus.json()) as { status?: string }
    if (setupBody.status !== "pending") {
      throw new Error(
        `Mailpit E2E server at ${baseUrl} is not a clean install (setup status=${setupBody.status}).`,
      )
    }
  } catch (error) {
    await stopMailpitE2EServer({
      baseUrl,
      port,
      tempDir,
      serverPid: child.pid,
    })
    throw error
  }

  child.unref()
  return { baseUrl, port, tempDir, serverPid: child.pid }
}

export async function stopMailpitE2EServer(server: MailpitE2EServer): Promise<void> {
  if (server.serverPid) {
    try {
      process.kill(-server.serverPid, "SIGTERM")
    } catch {
      try {
        process.kill(server.serverPid, "SIGTERM")
      } catch {
        // already gone
      }
    }

    const started = Date.now()
    while (isPidAlive(server.serverPid) && Date.now() - started < 5_000) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (isPidAlive(server.serverPid)) {
      try {
        process.kill(-server.serverPid, "SIGKILL")
      } catch {
        try {
          process.kill(server.serverPid, "SIGKILL")
        } catch {
          // gone
        }
      }
    }
  }

  if (server.tempDir && fs.existsSync(server.tempDir)) {
    fs.rmSync(server.tempDir, { recursive: true, force: true })
  }
}
