import {
  AUDIT_EVENT_TYPE_VALUES,
  getAuditEventLabel,
  type AuditEventSummary,
  type AuditEventType,
  type ListAuditEventsResponse,
} from "@playblast/shared"
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { getDrizzle } from "../db/drizzle.js"
import { auditEvents, users } from "../db/schema/identity.js"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export function parseAuditEventTypeFilter(
  value: unknown,
): AuditEventType | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined
  }

  return AUDIT_EVENT_TYPE_VALUES.includes(value as AuditEventType)
    ? (value as AuditEventType)
    : undefined
}

export function parseAuditPagination(
  limitValue: unknown,
  offsetValue: unknown,
): { limit: number; offset: number } {
  const parsedLimit = Number.parseInt(String(limitValue ?? DEFAULT_LIMIT), 10)
  const parsedOffset = Number.parseInt(String(offsetValue ?? 0), 10)

  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0

  return { limit, offset }
}

function studioScopeCondition(studioId: string) {
  return or(eq(auditEvents.studioId, studioId), isNull(auditEvents.studioId))
}

function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

function getActorMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { name: string; email: string }>()
  }

  const db = getDrizzle()
  const rows = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(inArray(users.id, userIds))
    .all()

  return new Map(rows.map((row) => [row.id, { name: row.name, email: row.email }]))
}

function mapAuditEventRow(
  row: typeof auditEvents.$inferSelect,
  actorMap: Map<string, { name: string; email: string }>,
): AuditEventSummary {
  const actor = row.userId ? actorMap.get(row.userId) : undefined

  return {
    id: row.id,
    eventType: row.eventType,
    eventLabel: getAuditEventLabel(row.eventType),
    studioId: row.studioId,
    userId: row.userId,
    actorName: actor?.name ?? null,
    actorEmail: actor?.email ?? null,
    metadata: parseMetadata(row.metadata),
    createdAt: row.createdAt,
  }
}

export function listAuditEvents(
  studioId: string,
  options: { limit: number; offset: number; eventType?: AuditEventType },
): ListAuditEventsResponse {
  const db = getDrizzle()
  const filters = [studioScopeCondition(studioId)]

  if (options.eventType) {
    filters.push(eq(auditEvents.eventType, options.eventType))
  }

  const whereClause = and(...filters)

  const totalRow = db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(whereClause)
    .get()

  const rows = db
    .select()
    .from(auditEvents)
    .where(whereClause)
    .orderBy(desc(auditEvents.createdAt))
    .limit(options.limit)
    .offset(options.offset)
    .all()

  const actorMap = getActorMap(
    rows.map((row) => row.userId).filter((userId): userId is string => Boolean(userId)),
  )

  return {
    events: rows.map((row) => mapAuditEventRow(row, actorMap)),
    total: totalRow?.count ?? 0,
    limit: options.limit,
    offset: options.offset,
  }
}

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

export function buildAuditEventsCsv(events: AuditEventSummary[]): string {
  const header = [
    "id",
    "created_at",
    "event_type",
    "event_label",
    "actor_name",
    "actor_email",
    "metadata",
  ]

  const lines = events.map((event) =>
    [
      event.id,
      event.createdAt,
      event.eventType,
      event.eventLabel,
      event.actorName ?? "",
      event.actorEmail ?? "",
      event.metadata ? JSON.stringify(event.metadata) : "",
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(","),
  )

  return [header.join(","), ...lines].join("\n")
}
