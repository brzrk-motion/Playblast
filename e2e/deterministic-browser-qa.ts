/**
 * Deterministic browser QA fallback when Playwright cannot launch (missing OS libs).
 * Validates production client artifacts and three-role session flows via fetch.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  BROWSER_QA_ADMIN_EMAIL,
  BROWSER_QA_ADMIN_PASSWORD,
  BROWSER_QA_CREATIVE_EMAIL,
  BROWSER_QA_CREATIVE_PASSWORD,
  BROWSER_QA_PROOFING_EMAIL,
  BROWSER_QA_PROOFING_PASSWORD,
} from "./credentials.js"

const baseUrl = process.env.PLAYBLAST_BASE_URL ?? "http://127.0.0.1:3099"
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

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

async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (response.status !== 200) {
    throw new Error(`login failed for ${email}: ${response.status}`)
  }

  const session = (await response.json()) as { csrfToken: string }
  return {
    cookies: collectSetCookies(response),
    csrfToken: session.csrfToken,
  }
}

async function expectSpaShell(path: string) {
  const response = await fetch(`${baseUrl}${path}`)
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }

  const html = await response.text()
  if (!html.includes('<div id="root">') && !html.includes('id="root"')) {
    throw new Error(`${path} did not return the Playblast SPA shell`)
  }
}

function expectClientBundleContains(needle: string) {
  const assetsDir = path.join(repoRoot, "client/dist/assets")
  const bundles = fs.readdirSync(assetsDir).filter((name) => name.endsWith(".js"))
  const found = bundles.some((name) => fs.readFileSync(path.join(assetsDir, name), "utf8").includes(needle))
  if (!found) {
    throw new Error(`client bundle missing expected marker: ${needle}`)
  }
}

async function expectApiStatus(
  path: string,
  cookies: string[],
  csrfToken: string,
  expected: number,
  method = "GET",
) {
  const headers: Record<string, string> = {
    Cookie: cookieHeader(cookies),
    "X-CSRF-Token": csrfToken,
  }
  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify({ name: "QA Project" }),
  })
  if (response.status !== expected) {
    throw new Error(`${method} ${path} returned ${response.status}, expected ${expected}`)
  }
}

async function main() {
  await expectSpaShell("/login")
  await expectSpaShell("/team")
  expectClientBundleContains("login-email")
  expectClientBundleContains("Permission denied")

  const admin = await login(BROWSER_QA_ADMIN_EMAIL, BROWSER_QA_ADMIN_PASSWORD)
  await expectApiStatus("/api/users", admin.cookies, admin.csrfToken, 200)

  const creative = await login(BROWSER_QA_CREATIVE_EMAIL, BROWSER_QA_CREATIVE_PASSWORD)
  await expectApiStatus("/api/users", creative.cookies, creative.csrfToken, 403)

  const proofing = await login(BROWSER_QA_PROOFING_EMAIL, BROWSER_QA_PROOFING_PASSWORD)
  await expectApiStatus("/api/clients", proofing.cookies, proofing.csrfToken, 403)
  await expectApiStatus("/api/projects", proofing.cookies, proofing.csrfToken, 403, "POST")

  const unauthenticated = await fetch(`${baseUrl}/api/projects`)
  if (unauthenticated.status !== 401) {
    throw new Error(`/api/projects unauthenticated returned ${unauthenticated.status}`)
  }

  console.log("Deterministic browser QA fallback passed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Deterministic browser QA failed")
  process.exit(1)
})
