import { randomUUID } from "node:crypto"
import type { AuditEventType } from "@playblast/shared"
import { getDrizzle } from "../db/drizzle.js"
import { auditEvents } from "../db/schema/identity.js"

export { AUDIT_EVENT_TYPES } from "@playblast/shared"

export function recordAuditEvent(input: {
  eventType: AuditEventType
  studioId?: string | null
  userId?: string | null
  metadata?: Record<string, unknown>
}): void {
  const db = getDrizzle()
  const now = new Date().toISOString()

  db.insert(auditEvents)
    .values({
      id: randomUUID(),
      studioId: input.studioId ?? null,
      userId: input.userId ?? null,
      eventType: input.eventType,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: now,
    })
    .run()
}
