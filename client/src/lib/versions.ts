import type { Version, VersionStatus } from "@/types/version"

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  pending_review: "Pending Review",
  needs_revision: "Needs Revision",
  approved: "Approved",
}

export const VERSION_STATUS_ORDER: VersionStatus[] = [
  "pending_review",
  "needs_revision",
  "approved",
]

export const VERSION_LABEL_PATTERN = /^[a-zA-Z0-9._-]+$/

export function isValidVersionLabel(label: string): boolean {
  return VERSION_LABEL_PATTERN.test(label)
}

export function sortVersionsByDate(versions: Version[]): Version[] {
  return [...versions].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )
}

export function pickCompareVersionLabels(
  versions: Version[],
  leftLabel?: string | null,
  rightLabel?: string | null,
): { left: string | null; right: string | null } {
  const sorted = sortVersionsByDate(versions)

  const resolveLabel = (
    label: string | null | undefined,
    fallback: string | null,
  ) => {
    if (label && sorted.some((version) => version.label === label)) {
      return label
    }

    return fallback
  }

  const left = resolveLabel(leftLabel, sorted[0]?.label ?? null)
  let right = resolveLabel(
    rightLabel,
    sorted.find((version) => version.label !== left)?.label ?? left,
  )

  if (right !== null && right === left) {
    right = sorted.find((version) => version.label !== left)?.label ?? right
  }

  return { left, right }
}

export function suggestNextVersionLabel(versions: Version[]): string {
  const numericVersions = versions
    .map((version) => {
      const match = /^v(\d+)$/i.exec(version.label)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => value !== null)

  if (numericVersions.length > 0) {
    return `v${Math.max(...numericVersions) + 1}`
  }

  return versions.length === 0 ? "v1" : `v${versions.length + 1}`
}
