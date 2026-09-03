import fs from "node:fs"
import path from "node:path"
import { runtimeStatePath, readRuntimeState } from "./helpers/runtime.js"

function killProcessTree(pid: number): void {
  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    try {
      process.kill(pid, "SIGTERM")
    } catch {
      // already gone
    }
  }
}

export default async function globalTeardown(): Promise<void> {
  const stateFile = runtimeStatePath()
  if (!fs.existsSync(stateFile)) {
    return
  }

  let state
  try {
    state = readRuntimeState()
  } catch {
    return
  }

  if (state.serverPid) {
    killProcessTree(state.serverPid)
    const started = Date.now()
    while (Date.now() - started < 5_000) {
      try {
        process.kill(state.serverPid, 0)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch {
        break
      }
    }
    try {
      process.kill(-state.serverPid, "SIGKILL")
    } catch {
      try {
        process.kill(state.serverPid, "SIGKILL")
      } catch {
        // gone
      }
    }
  }

  if (state.tempDir && fs.existsSync(state.tempDir)) {
    fs.rmSync(state.tempDir, { recursive: true, force: true })
  }

  fs.rmSync(path.dirname(stateFile), { recursive: true, force: true })
}
