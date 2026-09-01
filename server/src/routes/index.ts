import { Router } from "express"
import {
  validateDeliverableParams,
  validateProjectParams,
} from "../middleware/validateParams.js"
import { protectedApiMiddleware } from "../middleware/authorization.js"
import commentsRouter, { commentByIdRouter } from "./comments.js"
import clientsRouter from "./clients.js"
import deliverablesRouter, { deliverableByIdRouter } from "./deliverables.js"
import identityRouter from "./identity.js"
import teamRouter from "./team.js"
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
apiRouter.use(teamRouter)

const securedRouter = Router()
securedRouter.use(...protectedApiMiddleware)
securedRouter.use("/leads", leadsRouter)
securedRouter.use("/clients", clientsRouter)
securedRouter.use("/services", servicesRouter)
securedRouter.use("/projects", projectsRouter)
securedRouter.use(
  "/projects/:projectId/deliverables",
  validateProjectParams,
  deliverablesRouter,
)
securedRouter.use("/projects/:projectId/milestones", milestonesRouter)
securedRouter.use("/projects/:projectId/services", projectServicesRouter)
securedRouter.use(
  "/projects/:projectId/invoices",
  validateProjectParams,
  projectInvoicesRouter,
)
securedRouter.use("/invoices", invoiceByIdRouter)
securedRouter.use("/deliverables", deliverableByIdRouter)
securedRouter.use("/milestones", milestoneByIdRouter)
securedRouter.use("/milestones/:milestoneId/tasks", tasksRouter)
securedRouter.use("/tasks", taskByIdRouter)
securedRouter.use("/tasks/:taskId/time-logs", timeLogsRouter)
securedRouter.use("/time-logs", timeLogByIdRouter)
securedRouter.use("/timesheet", timesheetRouter)
securedRouter.use("/versions", versionsRouter)
securedRouter.use("/comments", commentByIdRouter)
securedRouter.use(
  "/deliverables/:deliverableId/versions/:version/comments",
  validateDeliverableParams,
  commentsRouter,
)
securedRouter.use(
  "/deliverables/:deliverableId/versions/:version/upload",
  validateDeliverableParams,
  uploadRouter,
)

apiRouter.use(securedRouter)

export default apiRouter
