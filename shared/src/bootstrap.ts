import type { UserRole } from "./roles.js"

/** Setup lifecycle for a single self-hosted Playblast instance. */
export const SETUP_STATUSES = [
  "pending",
  "admin_created",
  "studio_configured",
  "complete",
] as const

export type SetupStatus = (typeof SETUP_STATUSES)[number]

export interface BootstrapAdminRules {
  /** Exactly one studio may exist per instance. */
  singleStudioPerInstance: true
  /** First admin is created during setup; subsequent admins are invited. */
  bootstrapAdminDuringSetup: true
  /** Setup completion is idempotent and race-safe. */
  setupClaimIsAtomic: true
  /** Invited users cannot be assigned admin through the invite flow. */
  inviteRolesExcludeAdmin: true
}

export const BOOTSTRAP_ADMIN_RULES: BootstrapAdminRules = {
  singleStudioPerInstance: true,
  bootstrapAdminDuringSetup: true,
  setupClaimIsAtomic: true,
  inviteRolesExcludeAdmin: true,
}

export const INVITABLE_ROLES = ["creative", "proofing"] as const satisfies readonly UserRole[]

export type InvitableRole = (typeof INVITABLE_ROLES)[number]

export interface SingleStudioInvariant {
  /** All studio-owned rows reference the lone studio id for this instance. */
  studioScopedData: true
  /** Cross-studio reads/writes are impossible in production configuration. */
  noCrossStudioAccess: true
  /** Second studio creation is rejected once setup is complete. */
  rejectAdditionalStudios: true
}

export const SINGLE_STUDIO_INVARIANT: SingleStudioInvariant = {
  studioScopedData: true,
  noCrossStudioAccess: true,
  rejectAdditionalStudios: true,
}

export interface BootstrapLifecycleStep {
  status: SetupStatus
  description: string
  nextRoute: string
}

export const BOOTSTRAP_LIFECYCLE: BootstrapLifecycleStep[] = [
  {
    status: "pending",
    description: "No admin or studio exists; instance awaits first-run setup.",
    nextRoute: "/setup",
  },
  {
    status: "admin_created",
    description: "Bootstrap admin account exists; studio profile is required.",
    nextRoute: "/setup/studio",
  },
  {
    status: "studio_configured",
    description: "Studio profile exists; SMTP and team invites may be configured.",
    nextRoute: "/setup/complete",
  },
  {
    status: "complete",
    description: "Setup finished; authenticated application routes are available.",
    nextRoute: "/",
  },
]

export function getBootstrapStep(status: SetupStatus): BootstrapLifecycleStep {
  const step = BOOTSTRAP_LIFECYCLE.find((entry) => entry.status === status)
  if (!step) {
    throw new Error(`Unknown setup status: ${status}`)
  }
  return step
}

export function isApplicationRouteAvailable(status: SetupStatus): boolean {
  return status === "complete"
}
