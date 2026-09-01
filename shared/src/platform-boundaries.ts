/**
 * Supported deployment and runtime boundaries for the MVP self-hosted instance.
 * Consolidates README, Dockerfile, and audit decisions into a single contract.
 */
export const PLATFORM_BOUNDARIES = {
  node: {
    minimum: "20.19.0",
    dockerImage: "node:20-alpine",
    releaseTarget: "Upgrade to supported Node LTS before Phase 7 release.",
  },
  docker: {
    required: true,
    composeVolumes: ["/app/data", "/app/uploads"],
    healthEndpoint: "/health",
  },
  nas: {
    supported: ["Synology Container Manager", "Linux bind-mount deployments"],
    documented: true,
  },
  browsers: {
    desktop: ["Chrome (current - 1)", "Firefox (current - 1)", "Safari (current - 1)", "Edge (current - 1)"],
    tablet: "Supported at desktop breakpoints for setup, review, Team, and profile.",
    mobile: "Out of MVP scope.",
  },
  media: {
    uploadMaxMegabytesEnv: "MAX_UPLOAD_SIZE",
    uploadDefaultMegabytes: 5000,
    storagePathEnv: "UPLOAD_DIR",
    playback: "Browser-supported codecs via HTML5/Vidstack; professional codecs not guaranteed.",
  },
  database: {
    engine: "SQLite",
    driver: "better-sqlite3",
    ormDirection: "Drizzle for new identity tables; legacy SQL migrations remain authoritative until reconciled.",
    pathEnv: "DB_PATH",
  },
  smtp: {
    transport: "Generic SMTP with TLS",
    developmentCapture: "Mailpit or equivalent capture transport",
    productionRequiresTest: true,
    noCentralizedCredential: true,
  },
} as const

export type PlatformBoundaries = typeof PLATFORM_BOUNDARIES
