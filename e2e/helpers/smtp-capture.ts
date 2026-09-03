import fs from "node:fs"
import path from "node:path"

export interface CapturedEmail {
  to: string
  subject: string
  text: string
  html: string
  capturedAt?: string
  filePath: string
}

export function listCapturedEmails(captureDir: string): CapturedEmail[] {
  if (!fs.existsSync(captureDir)) {
    return []
  }

  return fs
    .readdirSync(captureDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const filePath = path.join(captureDir, name)
      const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as Omit<
        CapturedEmail,
        "filePath"
      >
      return { ...payload, filePath }
    })
    .sort((a, b) => a.filePath.localeCompare(b.filePath))
}

export function extractInviteToken(email: CapturedEmail): string {
  const match = email.text.match(/\/invite\/([A-Za-z0-9_-]+)/)
  if (!match?.[1]) {
    throw new Error(`Invite token missing from captured email to ${email.to}`)
  }
  return match[1]
}

export async function waitForInviteEmail(
  captureDir: string,
  recipient: string,
  options: { timeoutMs?: number; afterCount?: number } = {},
): Promise<CapturedEmail> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const afterCount = options.afterCount ?? 0
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const matches = listCapturedEmails(captureDir).filter(
      (email) => email.to.toLowerCase() === recipient.toLowerCase(),
    )
    if (matches.length > afterCount) {
      return matches[matches.length - 1]!
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for invite email to ${recipient}`)
}

export function clearSmtpCapture(captureDir: string): void {
  if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true })
    return
  }
  for (const name of fs.readdirSync(captureDir)) {
    fs.rmSync(path.join(captureDir, name), { force: true })
  }
}
