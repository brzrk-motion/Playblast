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

/** @deprecated Use E2E_* credentials; kept for deterministic-browser-qa fallback. */
export const BROWSER_QA_ADMIN_EMAIL = E2E_ADMIN.email
export const BROWSER_QA_ADMIN_PASSWORD = E2E_ADMIN.password
export const BROWSER_QA_CREATIVE_EMAIL = E2E_CREATIVE.email
export const BROWSER_QA_CREATIVE_PASSWORD = E2E_CREATIVE.password
export const BROWSER_QA_PROOFING_EMAIL = E2E_PROOFING.email
export const BROWSER_QA_PROOFING_PASSWORD = E2E_PROOFING.password
