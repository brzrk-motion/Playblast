import fs from "node:fs"
import cors from "cors"
import express, { type NextFunction, type Request, type Response } from "express"
import path from "node:path"
import { CLIENT_DIST } from "./config/paths.js"
import { validateVideoParams } from "./middleware/validateParams.js"
import apiRouter from "./routes/index.js"
import videoRouter from "./routes/video.js"

export function createApp() {
  const app = express()

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  })

  app.use(cors())
  app.use(express.json())
  app.use("/api", apiRouter)
  app.use(
    "/video/:projectId/:deliverableId/:version/:filename",
    validateVideoParams,
    videoRouter,
  )

  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST))
    app.use((_req, res, next) => {
      res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
        if (err) next(err)
      })
    })
  }

  // Catch-all error handler so a thrown route error returns a controlled 500
  // instead of bubbling up and potentially crashing the process.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled request error:", err)
    if (res.headersSent) {
      res.destroy()
      return
    }
    res.status(500).json({ error: "Internal server error" })
  })

  return app
}
