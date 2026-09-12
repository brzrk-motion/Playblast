/**
 * Fixture credentials for Playwright E2E only.
 * Values are intentional fixtures — never log them in CI output.
 */
export const E2E_ADMIN = {
  name: "E2E Admin",
  email: "admin@e2e.fixture",
  password: "e2e admin password 99ok",
} as const

export const E2E_CREATIVE = {
  name: "E2E Creative",
  email: "creative@e2e.fixture",
  password: "e2e creative password 99ok",
} as const

export const E2E_PROOFING = {
  name: "E2E Proofing",
  email: "proofing@e2e.fixture",
  password: "e2e proofing password 99ok",
} as const

export const E2E_ACCOUNT_EXECUTIVE = {
  name: "E2E Account Executive",
  email: "account-executive@e2e.fixture",
  password: "e2e account executive password 99ok",
} as const
