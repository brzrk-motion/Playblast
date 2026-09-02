import type { AuthSuccessResponse } from "@playblast/shared"

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

export async function setupAdminAccount(
  baseUrl: string,
  options?: {
    name?: string
    email?: string
    password?: string
  },
): Promise<{ session: AuthSuccessResponse; cookies: string[]; csrfToken: string }> {
  const password = options?.password ?? "correct horse battery 99"
  const response = await fetch(`${baseUrl}/api/setup/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: options?.name ?? "Fixture Admin",
      email: options?.email ?? "admin@fixture.studio",
      password,
      confirmPassword: password,
    }),
  })

  if (response.status !== 201) {
    throw new Error(`setup admin failed: ${response.status}`)
  }

  const session = (await response.json()) as AuthSuccessResponse
  return {
    session,
    cookies: collectSetCookies(response),
    csrfToken: session.csrfToken,
  }
}

export async function completeStudioSetup(
  baseUrl: string,
  cookies: string[],
  csrfToken: string,
  studioName = "Fixture Studio",
): Promise<void> {
  await fetch(`${baseUrl}/api/studio`, {
    method: "PATCH",
    headers: authHeaders(cookies, csrfToken),
    body: JSON.stringify({ name: studioName }),
  })

  await fetch(`${baseUrl}/api/setup/complete`, {
    method: "POST",
    headers: authHeaders(cookies, csrfToken),
  })
}

export async function loginAccount(
  baseUrl: string,
  email: string,
  password: string,
): Promise<{ session: AuthSuccessResponse; cookies: string[]; csrfToken: string }> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (response.status !== 200) {
    throw new Error(`login failed: ${response.status}`)
  }

  const session = (await response.json()) as AuthSuccessResponse
  return {
    session,
    cookies: collectSetCookies(response),
    csrfToken: session.csrfToken,
  }
}
