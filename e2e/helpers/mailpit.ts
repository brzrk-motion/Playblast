export interface MailpitMessageSummary {
  ID: string
  Subject: string
  To: Array<{ Address: string }>
  Snippet: string
}

export interface MailpitMessageListResponse {
  total: number
  count: number
  messages: MailpitMessageSummary[]
}

function normalizeMailpitApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/$/, "")
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
