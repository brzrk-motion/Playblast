#!/usr/bin/env node
/**
 * One-time migration: import legacy JSON store into SQLite.
 *
 * Usage:
 *   node scripts/migrate-json-to-sqlite.js [path/to/store.json]
 *
 * Environment:
 *   DB_PATH              Target SQLite file (default: /app/data/playblast.db)
 *   PLAYBLAST_DATA_DIR   Directory to search for store.json when no path is given
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..")
const SCHEMA_PATH = path.join(REPO_ROOT, "server/src/storage/schema.sql")

const DEFAULT_DATA_DIR = path.join(REPO_ROOT, "server/data")
const STORE_FILENAMES = ["store.json", "db.json"]
const PLACEHOLDER_COMMENT_PATTERNS = [/update customize text here/i]

function isPlaceholderComment(comment) {
  const body = comment.body.trim()
  return PLACEHOLDER_COMMENT_PATTERNS.some((pattern) => pattern.test(body))
}

function resolveJsonPath(argPath) {
  if (argPath) {
    return path.resolve(argPath)
  }

  const dataDir = process.env.PLAYBLAST_DATA_DIR
    ? path.resolve(process.env.PLAYBLAST_DATA_DIR)
    : DEFAULT_DATA_DIR

  for (const filename of STORE_FILENAMES) {
    const candidate = path.join(dataDir, filename)
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `No JSON store found. Pass a path or set PLAYBLAST_DATA_DIR (checked ${STORE_FILENAMES.join(", ")} in ${dataDir}).`,
  )
}

function normalizeVersionStatus(status) {
  if (
    status === "pending_review" ||
    status === "needs_revision" ||
    status === "approved"
  ) {
    return status
  }

  return "pending_review"
}

function isDataStore(value) {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value
  return (
    Array.isArray(record.projects) &&
    Array.isArray(record.versions) &&
    Array.isArray(record.comments) &&
    (record.deliverables === undefined || Array.isArray(record.deliverables)) &&
    (record.milestones === undefined || Array.isArray(record.milestones))
  )
}

function loadStore(jsonPath) {
  const raw = fs.readFileSync(jsonPath, "utf8")
  const parsed = JSON.parse(raw)

  if (!isDataStore(parsed)) {
    throw new Error(`Invalid data store format at ${jsonPath}`)
  }

  return {
    projects: parsed.projects,
    deliverables: parsed.deliverables ?? [],
    milestones: parsed.milestones ?? [],
    versions: parsed.versions.map((version) => ({
      ...version,
      status: normalizeVersionStatus(version.status),
    })),
    comments: parsed.comments.filter((comment) => !isPlaceholderComment(comment)),
  }
}

function main() {
  const jsonPath = resolveJsonPath(process.argv[2])
  const dbPath = path.resolve(process.env.DB_PATH ?? "/app/data/playblast.db")
  const store = loadStore(jsonPath)

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  if (fs.existsSync(dbPath)) {
    console.error(`Refusing to overwrite existing database: ${dbPath}`)
    console.error("Move or remove the file, or set DB_PATH to a new location.")
    process.exit(1)
  }

  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"))

  const insertProject = db.prepare(
    `INSERT INTO projects (
      id, name, createdAt, status, client, description, startDate, endDate, budget
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const insertDeliverable = db.prepare(
    `INSERT INTO deliverables (
      id, projectId, name, description, status, dueDate, createdAt, "order"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const insertMilestone = db.prepare(
    `INSERT INTO milestones (
      id, projectId, name, dueDate, done, "order", createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )

  const insertVersion = db.prepare(
    `INSERT INTO versions (
      id, projectId, deliverableId, label, filename, uploadedAt, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )

  const insertComment = db.prepare(
    `INSERT INTO comments (
      id, versionId, timestamp, body, author, createdAt, resolved, annotation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const migrate = db.transaction(() => {
    for (const project of store.projects) {
      insertProject.run(
        project.id,
        project.name,
        project.createdAt,
        project.status ?? "active",
        project.client ?? null,
        project.description ?? null,
        project.startDate ?? null,
        project.endDate ?? null,
        project.budget ? JSON.stringify(project.budget) : null,
      )
    }

    for (const deliverable of store.deliverables) {
      insertDeliverable.run(
        deliverable.id,
        deliverable.projectId,
        deliverable.name,
        deliverable.description ?? null,
        deliverable.status ?? "not_started",
        deliverable.dueDate ?? null,
        deliverable.createdAt,
        deliverable.order ?? 0,
      )
    }

    for (const milestone of store.milestones) {
      insertMilestone.run(
        milestone.id,
        milestone.projectId,
        milestone.name,
        milestone.dueDate ?? null,
        milestone.done ? 1 : 0,
        milestone.order ?? 0,
        milestone.createdAt,
      )
    }

    for (const version of store.versions) {
      insertVersion.run(
        version.id,
        version.projectId,
        version.deliverableId,
        version.label,
        version.filename,
        version.uploadedAt,
        version.status,
      )
    }

    for (const comment of store.comments) {
      insertComment.run(
        comment.id,
        comment.versionId,
        comment.timestamp,
        comment.body,
        comment.author,
        comment.createdAt,
        comment.resolved ? 1 : 0,
        comment.annotation ? JSON.stringify(comment.annotation) : null,
      )
    }
  })

  migrate()

  console.log(`Imported JSON store from ${jsonPath}`)
  console.log(`SQLite database written to ${dbPath}`)
  console.log(
    `Records: ${store.projects.length} projects, ${store.deliverables.length} deliverables, ${store.milestones.length} milestones, ${store.versions.length} versions, ${store.comments.length} comments`,
  )

  db.close()
}

main()
