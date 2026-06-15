import { createApp } from "./app.js"
import { config } from "./config/env.js"
import { ensureUploadDir } from "./config/paths.js"
import { closeDatabase, initDatabase } from "./storage/db.js"

const uploadDir = ensureUploadDir()
initDatabase()
const app = createApp()

const server = app.listen(config.port, () => {
  console.log(`Playblast server listening on http://localhost:${config.port}`)
  console.log(`Upload directory: ${uploadDir}`)
  console.log(`Database: ${config.dbPath}`)
})

// A single uncaught error or rejected promise must not silently kill the
// long-running container. Log it and keep serving; only fatal startup errors
// should terminate the process.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err)
})

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason)
})

let shuttingDown = false

function shutdown(signal: string): void {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  console.log(`Received ${signal}, shutting down gracefully...`)

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after timeout")
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  server.close(() => {
    closeDatabase()
    clearTimeout(forceExit)
    process.exit(0)
  })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
