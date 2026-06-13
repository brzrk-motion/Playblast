import type { LeadStatus } from "@/types/lead"

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  negotiating: "Negotiating",
  converted: "Converted",
  lost: "Lost",
}

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  new: "status-pending",
  contacted:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  replied: "status-success",
  negotiating: "status-warning",
  converted:
    "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400",
  lost: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function filterLeadsBySearch<
  T extends { name: string; company?: string },
>(leads: T[], query: string): T[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return leads
  }

  return leads.filter((lead) => {
    const haystack = [lead.name, lead.company ?? ""]
      .join(" ")
      .toLowerCase()
    return haystack.includes(normalized)
  })
}
