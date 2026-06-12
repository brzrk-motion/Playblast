import fs from "node:fs"
import cors from "cors"
import express from "express"
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
    "/video/:projectId/:version/:filename",
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

  return app
}
