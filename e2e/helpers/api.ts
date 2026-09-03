/**
 * Cookie / CSRF helpers for direct API probes from Playwright tests.
 */

export function collectSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }
  const single = response.headers.get("set-cookie")
  return single ? [single] : []
}

export function cookieHeader(cookies: string[]): string {
  return cookies.map((entry) => entry.split(";")[0]!).join("; ")
}

export function authHeaders(
  cookies: string[],
  csrfToken: string,
  json = true,
): HeadersInit {
  const headers: Record<string, string> = {
    Cookie: cookieHeader(cookies),
    "X-CSRF-Token": csrfToken,
  }
  if (json) {
    headers["Content-Type"] = "application/json"
  }
  return headers
}

export async function apiLogin(
  baseUrl: string,
  email: string,
  password: string,
): Promise<{ cookies: string[]; csrfToken: string; body: unknown }> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (response.status !== 200) {
    throw new Error(`login failed for ${email}: ${response.status}`)
  }
  const body = (await response.json()) as { csrfToken: string }
  return {
    cookies: collectSetCookies(response),
    csrfToken: body.csrfToken,
    body,
  }
}

export async function apiFetch(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    cookies?: string[]
    csrfToken?: string
    body?: unknown
    json?: boolean
  } = {},
): Promise<Response> {
  const method = options.method ?? "GET"
  const headers: Record<string, string> = {}
  if (options.cookies?.length) {
    headers.Cookie = cookieHeader(options.cookies)
  }
  if (options.csrfToken) {
    headers["X-CSRF-Token"] = options.csrfToken
  }
  const useJson =
    options.json !== false &&
    options.body !== undefined &&
    method !== "GET" &&
    method !== "DELETE"
  if (useJson) {
    headers["Content-Type"] = "application/json"
  }

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: useJson ? JSON.stringify(options.body) : undefined,
  })
}
