import { randomUUID } from "node:crypto"
import { and, eq, lt } from "drizzle-orm"
import type { CurrentSessionResponse } from "@playblast/shared"
import { getDrizzle } from "../db/drizzle.js"
import { sessions, studios, users } from "../db/schema/identity.js"
import { AUDIT_EVENT_TYPES, recordAuditEvent } from "./audit.js"
import { authConfig } from "./config.js"
import { generateOpaqueToken, hashToken } from "./tokens.js"

export interface SessionContext {
  sessionId: string
  userId: string
  studioId: string
  expiresAt: string
}

export interface CreatedSession {
  sessionToken: string
  csrfToken: string
  expiresAt: string
  response: CurrentSessionResponse
}

function buildSessionResponse(
  user: typeof users.$inferSelect,
  studio: typeof studios.$inferSelect,
  expiresAt: string,
): CurrentSessionResponse {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      disabled: user.disabled,
    },
    studio: {
      id: studio.id,
      name: studio.name,
      setupStatus: studio.setupStatus,
    },
    expiresAt,
  }
}

export function purgeExpiredSessions(): void {
  const db = getDrizzle()
  const now = new Date().toISOString()
  db.delete(sessions).where(lt(sessions.expiresAt, now)).run()
}

export function createSession(userId: string, studioId: string): CreatedSession {
  const db = getDrizzle()
  const sessionToken = generateOpaqueToken()
  const csrfToken = generateOpaqueToken(24)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + authConfig.sessionTtlMs).toISOString()
  const createdAt = now.toISOString()

  const user = db.select().from(users).where(eq(users.id, userId)).get()
  const studio = db.select().from(studios).where(eq(studios.id, studioId)).get()

  if (!user || !studio) {
    throw new Error("Cannot create session for missing user or studio")
  }

  db.insert(sessions)
    .values({
      id: randomUUID(),
      userId,
      studioId,
      tokenHash: hashToken(sessionToken),
      expiresAt,
      createdAt,
      lastSeenAt: createdAt,
    })
    .run()

  return {
    sessionToken,
    csrfToken,
    expiresAt,
    response: buildSessionResponse(user, studio, expiresAt),
  }
}

export function resolveSession(token: string | null): SessionContext | null {
  if (!token) {
    return null
  }

  purgeExpiredSessions()

  const db = getDrizzle()
  const tokenHash = hashToken(token)
  const row = db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .get()

  if (!row) {
    return null
  }

  if (row.expiresAt <= new Date().toISOString()) {
    db.delete(sessions).where(eq(sessions.id, row.id)).run()
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.sessionExpired,
      studioId: row.studioId,
      userId: row.userId,
    })
    return null
  }

  const user = db.select().from(users).where(eq(users.id, row.userId)).get()
  if (!user || user.disabled) {
    db.delete(sessions).where(eq(sessions.id, row.id)).run()
    return null
  }

  const lastSeenAt = new Date().toISOString()
  db.update(sessions)
    .set({ lastSeenAt })
    .where(eq(sessions.id, row.id))
    .run()

  return {
    sessionId: row.id,
    userId: row.userId,
    studioId: row.studioId,
    expiresAt: row.expiresAt,
  }
}

export function getCurrentSessionResponse(
  context: SessionContext,
): CurrentSessionResponse | null {
  const db = getDrizzle()
  const user = db.select().from(users).where(eq(users.id, context.userId)).get()
  const studio = db.select().from(studios).where(eq(studios.id, context.studioId)).get()

  if (!user || !studio || user.disabled) {
    return null
  }

  return buildSessionResponse(user, studio, context.expiresAt)
}

export function destroySessionByToken(token: string | null): boolean {
  if (!token) {
    return false
  }

  const db = getDrizzle()
  const tokenHash = hashToken(token)
  const row = db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .get()

  if (!row) {
    return false
  }

  db.delete(sessions).where(eq(sessions.id, row.id)).run()
  return true
}

export function destroyAllSessionsForUser(userId: string): number {
  const db = getDrizzle()
  const rows = db.select().from(sessions).where(eq(sessions.userId, userId)).all()
  db.delete(sessions).where(eq(sessions.userId, userId)).run()
  return rows.length
}

export function destroyAllSessionsForStudio(studioId: string): number {
  const db = getDrizzle()
  const rows = db.select().from(sessions).where(eq(sessions.studioId, studioId)).all()
  db.delete(sessions).where(eq(sessions.studioId, studioId)).run()
  return rows.length
}

export function destroySessionById(sessionId: string): void {
  const db = getDrizzle()
  db.delete(sessions).where(eq(sessions.id, sessionId)).run()
}

export function countSessionsForUser(userId: string): number {
  const db = getDrizzle()
  return db.select().from(sessions).where(eq(sessions.userId, userId)).all().length
}

export function getSessionRowByToken(token: string) {
  const db = getDrizzle()
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)))
    .get()
}

export function __testOnly_getSessionByUserId(userId: string) {
  const db = getDrizzle()
  return db.select().from(sessions).where(eq(sessions.userId, userId)).all()
}
