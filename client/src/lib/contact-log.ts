import type { ContactLogType } from "@/types/contact-log"

export const CONTACT_LOG_TYPE_LABELS: Record<ContactLogType, string> = {
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  note: "Note",
}

export const CONTACT_LOG_TYPE_ICONS: Record<ContactLogType, string> = {
  email: "📧",
  call: "📞",
  meeting: "🗓",
  note: "📝",
}

export function sortContactLogChronological<T extends { contactedAt: string; createdAt: string }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => {
    const contactedDiff =
      new Date(a.contactedAt).getTime() - new Date(b.contactedAt).getTime()
    if (contactedDiff !== 0) {
      return contactedDiff
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

export function toDateInputValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function dateInputToIso(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number)
  return new Date(year, month - 1, day, 12, 0, 0).toISOString()
}
