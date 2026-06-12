import type { Version } from "@/types/version"

export const VERSION_LABEL_PATTERN = /^[a-zA-Z0-9._-]+$/

export function isValidVersionLabel(label: string): boolean {
  return VERSION_LABEL_PATTERN.test(label)
}

export function sortVersionsByDate(versions: Version[]): Version[] {
  return [...versions].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )
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
