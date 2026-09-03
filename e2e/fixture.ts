/**
 * Seeds a fresh Playblast instance for non-browser QA fallback via API + SQLite insert.
 * Uses fixture credentials only; never logs secret values.
 */
import Database from "better-sqlite3"
import { randomUUID } from "node:crypto"
import {
  E2E_ADMIN,
  E2E_CREATIVE,
  E2E_PROOFING,
} from "./credentials.js"

const baseUrl = process.env.PLAYBLAST_BASE_URL ?? "http://127.0.0.1:3098"
const dbPath = process.env.DB_PATH

function collectSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }
  const single = response.headers.get("set-cookie")
  return single ? [single] : []
}

function cookieHeader(cookies: string[]): string {
  return cookies.map((entry) => entry.split(";")[0]!).join("; ")
}

function authHeaders(cookies: string[], csrfToken: string, json = true): HeadersInit {
  const headers: Record<string, string> = {
    Cookie: cookieHeader(cookies),
    "X-CSRF-Token": csrfToken,
  }
  if (json) {
    headers["Content-Type"] = "application/json"
  }
  return headers
}

async function hashPassword(password: string): Promise<string> {
  const { hashPasswordSync } = await import("../server/src/auth/password.js")
  return hashPasswordSync(password)
}

async function normalizeEmail(email: string): Promise<string> {
  const { normalizeEmail: normalize } = await import("../server/src/auth/password.js")
  return normalize(email)
}

async function bootstrapAdmin() {
  const response = await fetch(`${baseUrl}/api/setup/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: E2E_ADMIN.name,
      email: E2E_ADMIN.email,
      password: E2E_ADMIN.password,
      confirmPassword: E2E_ADMIN.password,
    }),
  })

  if (response.status !== 201) {
    throw new Error(`bootstrap admin failed: ${response.status}`)
  }

  const session = (await response.json()) as { csrfToken: string; studio: { id: string } }
  return {
    cookies: collectSetCookies(response),
    csrfToken: session.csrfToken,
    studioId: session.studio.id,
  }
}

async function completeSetup(cookies: string[], csrfToken: string) {
  await fetch(`${baseUrl}/api/studio`, {
    method: "PATCH",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({ name: "Browser QA Studio" }),
  })

  await fetch(`${baseUrl}/api/setup/complete`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
  })
}

async function insertRoleUser(
  studioId: string,
  role: "creative" | "proofing",
  email: string,
  password: string,
  name: string,
) {
  if (!dbPath) {
    throw new Error("DB_PATH is required to seed role users")
  }

  const db = new Database(dbPath)
  const now = new Date().toISOString()
  const passwordHash = await hashPassword(password)
  const emailNormalized = await normalizeEmail(email)

  db.prepare(
    `INSERT INTO users (
      id, studio_id, name, email, email_normalized, password_hash, role, disabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(
    randomUUID(),
    studioId,
    name,
    email,
    emailNormalized,
    passwordHash,
    role,
    now,
    now,
  )
  db.close()
}

async function main() {
  const health = await fetch(`${baseUrl}/health`)
  if (!health.ok) {
    throw new Error(`server unhealthy: ${health.status}`)
  }

  const admin = await bootstrapAdmin()
  await completeSetup(admin.cookies, admin.csrfToken)

  await insertRoleUser(
    admin.studioId,
    "creative",
    E2E_CREATIVE.email,
    E2E_CREATIVE.password,
    E2E_CREATIVE.name,
  )
  await insertRoleUser(
    admin.studioId,
    "proofing",
    E2E_PROOFING.email,
    E2E_PROOFING.password,
    E2E_PROOFING.name,
  )

  console.log("Browser QA fixture ready.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Browser QA fixture failed")
  process.exit(1)
})
