export const DEFAULT_MAILPIT_SMTP_HOST = "mailpit"
export const MAILPIT_SMTP_PORT = 1025
export const MAILPIT_UI_PORT = 8025

function isNonEmptyEnv(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== ""
}

export function isEmailCatcherEnabled(
  nodeEnv: "production" | "development",
  catcherFlag: string | undefined = process.env.PLAYBLAST_EMAIL_CATCHER,
): boolean {
  if (nodeEnv === "development") {
    return true
  }

  return catcherFlag?.trim().toLowerCase() === "mailpit"
}

export function resolveDefaultSmtpHost(
  nodeEnv: "production" | "development" = (process.env.NODE_ENV === "production"
    ? "production"
    : "development"),
): string | undefined {
  if (!isEmailCatcherEnabled(nodeEnv)) {
    return undefined
  }

  if (isNonEmptyEnv(process.env.SMTP_HOST)) {
    return undefined
  }

  return DEFAULT_MAILPIT_SMTP_HOST
}

export function normalizeSmtpHost(host: string): string {
  return host.trim().toLowerCase()
}

export function isLocalhostHost(host: string): boolean {
  const normalized = normalizeSmtpHost(host)
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1"
}

export function isSmtpCatcherEndpoint(host: string, port: number): boolean {
  const normalizedHost = normalizeSmtpHost(host)

  if (normalizedHost === DEFAULT_MAILPIT_SMTP_HOST) {
    return true
  }

  return isLocalhostHost(host) && port === MAILPIT_SMTP_PORT
}

export function getProductionCatcherRefusalMessage(
  host: string,
  port: number,
): string {
  return `Production SMTP must not point at a development email catcher (${host}:${port}). Configure a real mail relay instead of Mailpit or localhost:${MAILPIT_SMTP_PORT}.`
}

export function assertProductionSmtpNotCatcher(host: string, port: number): void {
  if (isSmtpCatcherEndpoint(host, port)) {
    throw new Error(getProductionCatcherRefusalMessage(host, port))
  }
}
