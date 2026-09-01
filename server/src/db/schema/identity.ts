import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const SETUP_STATUS_VALUES = [
  "pending",
  "admin_created",
  "studio_configured",
  "complete",
] as const

export const USER_ROLE_VALUES = ["admin", "creative", "proofing"] as const

export const INVITABLE_ROLE_VALUES = ["creative", "proofing"] as const

export const INVITATION_STATUS_VALUES = [
  "pending",
  "accepted",
  "expired",
  "revoked",
  "delivery_failed",
] as const

export const studios = sqliteTable(
  "studios",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().default(""),
    avatarPath: text("avatar_path"),
    setupStatus: text("setup_status", { enum: SETUP_STATUS_VALUES })
      .notNull()
      .default("pending"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check(
      "studios_setup_status_check",
      sql`${table.setupStatus} IN ('pending', 'admin_created', 'studio_configured', 'complete')`,
    ),
  ],
)

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    studioId: text("studio_id")
      .notNull()
      .references(() => studios.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    passwordHash: text("password_hash"),
    role: text("role", { enum: USER_ROLE_VALUES }).notNull(),
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("users_email_normalized_unique").on(table.emailNormalized),
    uniqueIndex("users_studio_email_unique").on(table.studioId, table.emailNormalized),
    index("users_studio_id_idx").on(table.studioId),
    check(
      "users_role_check",
      sql`${table.role} IN ('admin', 'creative', 'proofing')`,
    ),
  ],
)

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studioId: text("studio_id")
      .notNull()
      .references(() => studios.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_studio_id_idx").on(table.studioId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
)

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    studioId: text("studio_id")
      .notNull()
      .references(() => studios.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: INVITABLE_ROLE_VALUES }).notNull(),
    tokenHash: text("token_hash").notNull(),
    status: text("status", { enum: INVITATION_STATUS_VALUES })
      .notNull()
      .default("pending"),
    expiresAt: text("expires_at").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("invitations_studio_id_idx").on(table.studioId),
    index("invitations_email_normalized_idx").on(table.emailNormalized),
    index("invitations_status_idx").on(table.status),
    check(
      "invitations_role_check",
      sql`${table.role} IN ('creative', 'proofing')`,
    ),
    check(
      "invitations_status_check",
      sql`${table.status} IN ('pending', 'accepted', 'expired', 'revoked', 'delivery_failed')`,
    ),
  ],
)

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    studioId: text("studio_id").references(() => studios.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    metadata: text("metadata"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("audit_events_studio_id_idx").on(table.studioId),
    index("audit_events_user_id_idx").on(table.userId),
    index("audit_events_event_type_idx").on(table.eventType),
    index("audit_events_created_at_idx").on(table.createdAt),
  ],
)

export const identitySchema = {
  studios,
  users,
  sessions,
  invitations,
  auditEvents,
}
