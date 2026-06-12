import { Router } from "express"
import { validateProjectParams } from "../middleware/validateParams.js"
import uploadRouter from "./upload.js"

const apiRouter = Router()

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "playblast-server" })
})

apiRouter.use(
  "/projects/:projectId/versions/:version/upload",
  validateProjectParams,
  uploadRouter,
)

export default apiRouter
