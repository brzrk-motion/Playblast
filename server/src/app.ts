import cors from "cors"
import express from "express"
import { validateVideoParams } from "./middleware/validateParams.js"
import apiRouter from "./routes/index.js"
import videoRouter from "./routes/video.js"

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use("/api", apiRouter)
  app.use(
    "/video/:projectId/:version/:filename",
    validateVideoParams,
    videoRouter,
  )

  return app
}
