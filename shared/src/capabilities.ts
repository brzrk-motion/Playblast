import type { UserRole } from "./roles.js"

/**
 * Server-enforced capability identifiers derived from the MVP role matrix
 * in docs/Playblast-MVP-Audit.md.
 */
export const CAPABILITIES = [
  "setup.complete",
  "settings.smtp",
  "team.manage",
  "studio.view",
  "studio.manage",
  "projects.view",
  "projects.mutate",
  "media.upload",
  "media.version",
  "review.play",
  "review.compare",
  "comments.create",
  "annotations.create",
  "approval.mutate",
  "downloads.read",
  "data.delete",
] as const

export type Capability = (typeof CAPABILITIES)[number]

export type CapabilityGrant = "allow" | "deny"

export type RoleCapabilityMatrix = Record<Capability, Record<UserRole, CapabilityGrant>>

/**
 * Authoritative server capability contract. Admin is the superset; Proofing is
 * review-only except comments and annotations.
 */
export const ROLE_CAPABILITY_MATRIX: RoleCapabilityMatrix = {
  "setup.complete": { admin: "allow", creative: "deny", proofing: "deny" },
  "settings.smtp": { admin: "allow", creative: "deny", proofing: "deny" },
  "team.manage": { admin: "allow", creative: "deny", proofing: "deny" },
  "studio.view": { admin: "allow", creative: "allow", proofing: "allow" },
  "studio.manage": { admin: "allow", creative: "deny", proofing: "deny" },
  "projects.view": { admin: "allow", creative: "allow", proofing: "allow" },
  "projects.mutate": { admin: "allow", creative: "allow", proofing: "deny" },
  "media.upload": { admin: "allow", creative: "allow", proofing: "deny" },
  "media.version": { admin: "allow", creative: "allow", proofing: "deny" },
  "review.play": { admin: "allow", creative: "allow", proofing: "allow" },
  "review.compare": { admin: "allow", creative: "allow", proofing: "allow" },
  "comments.create": { admin: "allow", creative: "allow", proofing: "allow" },
  "annotations.create": { admin: "allow", creative: "allow", proofing: "allow" },
  "approval.mutate": { admin: "allow", creative: "allow", proofing: "deny" },
  "downloads.read": { admin: "allow", creative: "allow", proofing: "allow" },
  "data.delete": { admin: "allow", creative: "deny", proofing: "deny" },
}

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITY_MATRIX[capability][role] === "allow"
}

export function getCapabilitiesForRole(role: UserRole): Capability[] {
  return CAPABILITIES.filter((capability) => hasCapability(role, capability))
}

export function assertAdminSuperset(): void {
  const creativeCaps = getCapabilitiesForRole("creative")
  const proofingCaps = getCapabilitiesForRole("proofing")

  for (const capability of creativeCaps) {
    if (!hasCapability("admin", capability)) {
      throw new Error(`Admin must include Creative capability: ${capability}`)
    }
  }

  for (const capability of proofingCaps) {
    if (!hasCapability("admin", capability)) {
      throw new Error(`Admin must include Proofing capability: ${capability}`)
    }
  }
}
