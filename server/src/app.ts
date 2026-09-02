import fs from "node:fs"
import cors from "cors"
import express, { type NextFunction, type Request, type Response } from "express"
import path from "node:path"
import { config } from "./config/env.js"
import { CLIENT_DIST } from "./config/paths.js"
import { getDb } from "./storage/db.js"
import { createAuthMiddleware } from "./middleware/auth.js"
import {
  attachSessionContext,
  requireCsrfProtection,
} from "./middleware/session.js"
import {
  requireAuthenticatedSession,
  requireCapability,
  requireSetupComplete,
} from "./middleware/authorization.js"
import { validateVideoParams } from "./middleware/validateParams.js"
import apiRouter from "./routes/index.js"
import videoRouter from "./routes/video.js"

export function createApp() {
  const app = express()

  app.get("/health", (_req, res) => {
    try {
      const integrity = getDb().pragma("integrity_check", { simple: true })
      if (integrity !== "ok") {
        res.status(503).json({
          status: "degraded",
          database: "integrity_check_failed",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        })
        return
      }

      res.json({
        status: "ok",
        database: "ok",
        storage: {
          uploadDir: config.uploadDir,
          dbPath: config.dbPath,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    } catch {
      res.status(503).json({
        status: "degraded",
        database: "unavailable",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    }
  })

  app.use(createAuthMiddleware())
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(attachSessionContext())
  app.use(requireCsrfProtection())
  app.use("/api", apiRouter)
  app.use(
    "/video/:projectId/:deliverableId/:version/:filename",
    requireAuthenticatedSession(),
    requireSetupComplete(),
    requireCapability("review.play"),
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
