import { Router } from "express"
import {
  validateDeliverableParams,
  validateProjectParams,
} from "../middleware/validateParams.js"
import commentsRouter, { commentByIdRouter } from "./comments.js"
import deliverablesRouter, { deliverableByIdRouter } from "./deliverables.js"
import leadsRouter from "./leads.js"
import milestonesRouter, { milestoneByIdRouter } from "./milestones.js"
import projectsRouter from "./projects.js"
import uploadRouter from "./upload.js"
import versionsRouter from "./versions.js"

const apiRouter = Router()

apiRouter.use("/leads", leadsRouter)
apiRouter.use("/projects", projectsRouter)
apiRouter.use(
  "/projects/:projectId/deliverables",
  validateProjectParams,
  deliverablesRouter,
)
apiRouter.use("/projects/:projectId/milestones", milestonesRouter)
apiRouter.use("/deliverables", deliverableByIdRouter)
apiRouter.use("/milestones", milestoneByIdRouter)
apiRouter.use("/versions", versionsRouter)
apiRouter.use("/comments", commentByIdRouter)
apiRouter.use(
  "/deliverables/:deliverableId/versions/:version/comments",
  validateDeliverableParams,
  commentsRouter,
)
apiRouter.use(
  "/deliverables/:deliverableId/versions/:version/upload",
  validateDeliverableParams,
  uploadRouter,
)

export default apiRouter
