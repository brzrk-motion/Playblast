/** MVP application roles. Every user belongs to the single studio on this instance. */
export const USER_ROLES = ["admin", "creative", "proofing"] as const

export type UserRole = (typeof USER_ROLES)[number]

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value)
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  creative: "Creative",
  proofing: "Proofing",
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:
    "Manages installation setup, studio profile, users, SMTP, and every proofing action.",
  creative:
    "Creates and edits proofing work, uploads media, versions content, and participates in review.",
  proofing:
    "Reviews deliverables with read-only access to structure; may comment, annotate, compare, and download.",
}
