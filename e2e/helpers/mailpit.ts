export interface MailpitAddress {
  Name: string
  Address: string
}

export interface MailpitMessageSummary {
  ID: string
  Subject: string
  To: MailpitAddress[]
  Snippet: string
}

export interface MailpitMessageListResponse {
  total: number
  count: number
  messages: MailpitMessageSummary[]
}

export interface MailpitMessageBody {
  ID: string
  Subject: string
  From: MailpitAddress
  To: MailpitAddress[]
  Text: string
  HTML: string
}

function normalizeMailpitApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/$/, "")
}

export function resolveMailpitUrlFromEnv(): string | undefined {
  const fromEnv = process.env.MAILPIT_URL?.trim()
  return fromEnv || undefined
}

export function resolveMailpitSmtpHost(apiUrl: string): string {
  const parsed = new URL(normalizeMailpitApiUrl(apiUrl))
  return parsed.hostname
}

export function resolveMailpitSmtpPort(): number {
  const override = process.env.MAILPIT_SMTP_PORT?.trim()
  if (!override) {
    return 1025
  }

  const port = Number(override)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid MAILPIT_SMTP_PORT value: ${override}`)
  }

  return port
}

export async function isMailpitReachable(
  apiUrl: string,
  timeoutMs = 1_500,
): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${normalizeMailpitApiUrl(apiUrl)}/api/v1/info`, {
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function listMailpitMessages(
  apiUrl: string,
  options: { limit?: number } = {},
): Promise<MailpitMessageListResponse> {
  const params = new URLSearchParams()
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit))
  }

  const query = params.size > 0 ? `?${params.toString()}` : ""
  const response = await fetch(
    `${normalizeMailpitApiUrl(apiUrl)}/api/v1/messages${query}`,
  )

  if (!response.ok) {
    throw new Error(`Mailpit API request failed with status ${response.status}`)
  }

  return (await response.json()) as MailpitMessageListResponse
}

export async function getMailpitMessage(
  apiUrl: string,
  messageId: string,
): Promise<MailpitMessageBody> {
  const response = await fetch(
    `${normalizeMailpitApiUrl(apiUrl)}/api/v1/message/${messageId}`,
  )

  if (!response.ok) {
    throw new Error(`Mailpit message ${messageId} not found`)
  }

  return (await response.json()) as MailpitMessageBody
}

export async function waitForMailpitMessage(
  apiUrl: string,
  recipient: string,
  options: { timeoutMs?: number; subjectIncludes?: string } = {},
): Promise<MailpitMessageSummary> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const started = Date.now()
  const normalizedRecipient = recipient.trim().toLowerCase()

  while (Date.now() - started < timeoutMs) {
    const listing = await listMailpitMessages(apiUrl, { limit: 50 })
    const match = listing.messages.find((message) => {
      const recipients = message.To.map((entry) => entry.Address.toLowerCase())
      if (!recipients.includes(normalizedRecipient)) {
        return false
      }
      if (options.subjectIncludes) {
        return message.Subject.includes(options.subjectIncludes)
      }
      return true
    })

    if (match) {
      return match
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for Mailpit message to ${recipient}`)
}

export async function deleteAllMailpitMessages(apiUrl: string): Promise<void> {
  const response = await fetch(`${normalizeMailpitApiUrl(apiUrl)}/api/v1/messages`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`Mailpit delete failed with status ${response.status}`)
  }
}
