import { Router } from "express"
import {
  validateDeliverableParams,
  validateProjectParams,
} from "../middleware/validateParams.js"
import commentsRouter, { commentByIdRouter } from "./comments.js"
import clientsRouter from "./clients.js"
import deliverablesRouter, { deliverableByIdRouter } from "./deliverables.js"
import identityRouter from "./identity.js"
import projectInvoicesRouter, { invoiceByIdRouter } from "./invoices.js"
import leadsRouter from "./leads.js"
import milestonesRouter, { milestoneByIdRouter } from "./milestones.js"
import projectServicesRouter from "./project-services.js"
import projectsRouter from "./projects.js"
import servicesRouter from "./services.js"
import tasksRouter, { taskByIdRouter } from "./tasks.js"
import timeLogsRouter, { timeLogByIdRouter } from "./time-logs.js"
import timesheetRouter from "./timesheet.js"
import uploadRouter from "./upload.js"
import versionsRouter from "./versions.js"

const apiRouter = Router()

apiRouter.use(identityRouter)
apiRouter.use("/leads", leadsRouter)
apiRouter.use("/clients", clientsRouter)
apiRouter.use("/services", servicesRouter)
apiRouter.use("/projects", projectsRouter)
apiRouter.use(
  "/projects/:projectId/deliverables",
  validateProjectParams,
  deliverablesRouter,
)
apiRouter.use("/projects/:projectId/milestones", milestonesRouter)
apiRouter.use("/projects/:projectId/services", projectServicesRouter)
apiRouter.use(
  "/projects/:projectId/invoices",
  validateProjectParams,
  projectInvoicesRouter,
)
apiRouter.use("/invoices", invoiceByIdRouter)
apiRouter.use("/deliverables", deliverableByIdRouter)
apiRouter.use("/milestones", milestoneByIdRouter)
apiRouter.use("/milestones/:milestoneId/tasks", tasksRouter)
apiRouter.use("/tasks", taskByIdRouter)
apiRouter.use("/tasks/:taskId/time-logs", timeLogsRouter)
apiRouter.use("/time-logs", timeLogByIdRouter)
apiRouter.use("/timesheet", timesheetRouter)
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
