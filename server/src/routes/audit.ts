import { Router } from "express"
import { sendApiError } from "../lib/api-response.js"
import {
  buildAuditEventsCsv,
  listAuditEvents,
  parseAuditEventTypeFilter,
  parseAuditPagination,
} from "../identity/audit-service.js"
import { getSetupStatusResponse } from "../identity/repository.js"
import {
  requireAdminRole,
  requireAuthenticatedSession,
} from "../middleware/session.js"

const auditRouter = Router()

auditRouter.get(
  "/audit-events",
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    const setup = getSetupStatusResponse()
    if (!setup.setupComplete) {
      sendApiError(res, "SETUP_NOT_COMPLETE")
      return
    }

    const eventType = parseAuditEventTypeFilter(req.query.eventType)
    if (req.query.eventType && !eventType) {
      sendApiError(res, "VALIDATION_FAILED", "Validation failed.", {
        eventType: ["Invalid audit event type."],
      })
      return
    }

    const { limit, offset } = parseAuditPagination(req.query.limit, req.query.offset)
    const studioId = req.currentSession!.studio.id

    res.json(listAuditEvents(studioId, { limit, offset, eventType }))
  },
)

auditRouter.get(
  "/audit-events/export",
  requireAuthenticatedSession(),
  requireAdminRole(),
  (req, res) => {
    const setup = getSetupStatusResponse()
    if (!setup.setupComplete) {
      sendApiError(res, "SETUP_NOT_COMPLETE")
      return
    }

    const eventType = parseAuditEventTypeFilter(req.query.eventType)
    if (req.query.eventType && !eventType) {
      sendApiError(res, "VALIDATION_FAILED", "Validation failed.", {
        eventType: ["Invalid audit event type."],
      })
      return
    }

    const studioId = req.currentSession!.studio.id
    const { events } = listAuditEvents(studioId, {
      limit: 10_000,
      offset: 0,
      eventType,
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="playblast-audit-events-${timestamp}.csv"`,
    )
    res.send(buildAuditEventsCsv(events))
  },
)

export default auditRouter
