import { Router } from "express"
import { validateProjectParams } from "../middleware/validateParams.js"
import commentsRouter, { commentByIdRouter } from "./comments.js"
import projectsRouter from "./projects.js"
import uploadRouter from "./upload.js"
import versionsRouter from "./versions.js"

const apiRouter = Router()

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "playblast-server" })
})

apiRouter.use("/projects", projectsRouter)
apiRouter.use("/versions", versionsRouter)
apiRouter.use("/comments", commentByIdRouter)
apiRouter.use(
  "/projects/:projectId/versions/:version/comments",
  validateProjectParams,
  commentsRouter,
)
apiRouter.use(
  "/projects/:projectId/versions/:version/upload",
  validateProjectParams,
  uploadRouter,
)

export default apiRouter
