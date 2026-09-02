import type { Response } from "express"
import type { Request } from "express"
import { sendApiError } from "../lib/api-response.js"
import { getDb } from "../storage/db.js"

export interface StudioSessionContext {
  studioId: string
  userId: string
  userName: string
  role: "admin" | "creative" | "proofing"
}

export function getStudioSessionContext(
  request: Request,
): StudioSessionContext | null {
  const session = request.currentSession
  if (!session) {
    return null
  }

  return {
    studioId: session.studio.id,
    userId: session.user.id,
    userName: session.user.name,
    role: session.user.role,
  }
}

export function denyUnlessSameStudio(
  response: Response,
  resourceStudioId: string | null | undefined,
  sessionStudioId: string,
): boolean {
  if (!resourceStudioId || resourceStudioId !== sessionStudioId) {
    sendApiError(response, "NOT_FOUND")
    return false
  }

  return true
}

export function resolveProjectStudioId(projectId: string): string | undefined {
  const row = getDb()
    .prepare("SELECT studioId FROM projects WHERE id = ?")
    .get(projectId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveDeliverableStudioId(
  deliverableId: string,
): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT p.studioId AS studioId
       FROM deliverables d
       INNER JOIN projects p ON p.id = d.projectId
       WHERE d.id = ?`,
    )
    .get(deliverableId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveVersionStudioId(versionId: string): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT p.studioId AS studioId
       FROM versions v
       INNER JOIN projects p ON p.id = v.projectId
       WHERE v.id = ?`,
    )
    .get(versionId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveCommentStudioId(commentId: string): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT p.studioId AS studioId
       FROM comments c
       INNER JOIN versions v ON v.id = c.versionId
       INNER JOIN projects p ON p.id = v.projectId
       WHERE c.id = ?`,
    )
    .get(commentId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveClientStudioId(clientId: string): string | undefined {
  const row = getDb()
    .prepare("SELECT studioId FROM clients WHERE id = ?")
    .get(clientId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveLeadStudioId(leadId: string): string | undefined {
  const row = getDb()
    .prepare("SELECT studioId FROM leads WHERE id = ?")
    .get(leadId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveServiceStudioId(serviceId: string): string | undefined {
  const row = getDb()
    .prepare("SELECT studioId FROM services WHERE id = ?")
    .get(serviceId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveMilestoneStudioId(milestoneId: string): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT p.studioId AS studioId
       FROM milestones m
       INNER JOIN projects p ON p.id = m.projectId
       WHERE m.id = ?`,
    )
    .get(milestoneId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveTaskStudioId(taskId: string): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT p.studioId AS studioId
       FROM tasks t
       INNER JOIN milestones m ON m.id = t.milestoneId
       INNER JOIN projects p ON p.id = m.projectId
       WHERE t.id = ?`,
    )
    .get(taskId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveTimeLogStudioId(timeLogId: string): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT p.studioId AS studioId
       FROM time_logs tl
       INNER JOIN tasks t ON t.id = tl.taskId
       INNER JOIN milestones m ON m.id = t.milestoneId
       INNER JOIN projects p ON p.id = m.projectId
       WHERE tl.id = ?`,
    )
    .get(timeLogId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveInvoiceStudioId(invoiceId: string): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT p.studioId AS studioId
       FROM invoices i
       INNER JOIN projects p ON p.id = i.projectId
       WHERE i.id = ?`,
    )
    .get(invoiceId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function resolveContactLogStudioId(logId: string): string | undefined {
  const row = getDb()
    .prepare(
      `SELECT l.studioId AS studioId
       FROM contact_log cl
       INNER JOIN leads l ON l.id = cl.leadId
       WHERE cl.id = ?`,
    )
    .get(logId) as { studioId: string | null } | undefined

  return row?.studioId ?? undefined
}

export function getPrimaryStudioId(): string | undefined {
  const row = getDb()
    .prepare("SELECT id FROM studios ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string } | undefined

  return row?.id
}

export function assertSingleStudioInvariant(): void {
  const count = (
    getDb().prepare("SELECT COUNT(*) AS count FROM studios").get() as {
      count: number
    }
  ).count

  if (count > 1 && process.env.NODE_ENV === "production") {
    throw new Error("Multiple studios detected; MVP supports one studio per instance.")
  }
}
