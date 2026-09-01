/**
 * Data ownership, deletion, recovery, and backup contracts for one self-hosted studio.
 */
export const OPERATIONS_CONTRACT = {
  dataOwnership: {
    studioOwns: [
      "SQLite database file",
      "Uploaded media and generated avatars",
      "SMTP credentials in local deployment configuration",
      "Session and invitation token hashes",
    ],
    playblastDoesNotHost: [
      "Studio media",
      "User passwords or plaintext invite tokens",
      "SMTP credentials in a centralized service",
    ],
  },
  backup: {
    requiredPaths: ["DB_PATH directory", "UPLOAD_DIR directory"],
    script: "npm run verify:backup-restore",
    beforeMigration: true,
    includesSessions: true,
    includesInvites: true,
  },
  deletion: {
    adminOnly: [
      "Archive or delete projects and deliverables",
      "Remove studio users",
      "Revoke pending invitations",
      "Replace studio avatar",
    ],
    noStudioExportInMvp: "Full export workflow deferred; backup script is the operational path.",
  },
  recovery: {
    adminCredentialLoss: "Documented recovery path without plaintext password storage.",
    smtpUnavailable: "Instance remains usable; invitations require SMTP test success.",
    sessionInvalidation: "Password change and admin recovery invalidate affected sessions.",
  },
  supportBoundary: {
    selfHosted: true,
    noFounderSupport: true,
    publicIssueTracking: true,
    studioResponsibleFor: [
      "Docker host and networking",
      "HTTPS/VPN access",
      "SMTP deliverability",
      "Backup schedule and restore drills",
    ],
  },
} as const

export type OperationsContract = typeof OPERATIONS_CONTRACT
