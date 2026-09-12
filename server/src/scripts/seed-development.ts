import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { hashPasswordSync } from "../auth/password.js"
import { config } from "../config/env.js"
import { getDb } from "../storage/db.js"

const DEV_PASSWORD = "PlayblastDev2026"
const SEEDED_STUDIO_ID = "dev-studio"

const now = "2026-09-11T09:00:00.000Z"
const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "demo-review.mp4",
)

const demoVideos = [
  ["project-northstar-launch", "deliv-northstar-hero", "v1", "northstar-hero-v1.mp4"],
  ["project-northstar-launch", "deliv-northstar-hero", "v2", "northstar-hero-v2.mp4"],
  ["project-lumen-refresh", "deliv-lumen-system", "v3", "lumen-system-v3.mp4"],
  ["project-orbit-objects", "deliv-orbit-teaser", "v1", "orbit-teaser-v1.mp4"],
  ["project-harbor-identity", "deliv-harbor-master", "Final", "harbor-identity-final.mp4"],
] as const

export function ensureDevelopmentDemoVideos(uploadDir = config.uploadDir): boolean {
  if (config.nodeEnv !== "development") {
    return false
  }

  const db = getDb()
  const seededStudio = db
    .prepare("SELECT id FROM studios WHERE id = ?")
    .get(SEEDED_STUDIO_ID) as { id: string } | undefined

  if (!seededStudio) {
    return false
  }

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Development video fixture not found: ${fixturePath}`)
  }

  let restored = false
  for (const [projectId, deliverableId, version, filename] of demoVideos) {
    const versionDir = path.join(uploadDir, projectId, deliverableId, version)
    const videoPath = path.join(versionDir, filename)
    if (fs.existsSync(videoPath)) {
      continue
    }

    fs.mkdirSync(versionDir, { recursive: true })
    fs.copyFileSync(fixturePath, videoPath)
    restored = true
  }

  return restored
}

export function seedDevelopmentDatabase(uploadDir = config.uploadDir): boolean {
  if (config.nodeEnv !== "development") {
    return false
  }

  const db = getDb()
  const existingStudio = db
    .prepare("SELECT id FROM studios LIMIT 1")
    .get() as { id: string } | undefined

  if (existingStudio) {
    return false
  }

  const passwordHash = hashPasswordSync(DEV_PASSWORD)

  db.transaction(() => {
    db.prepare(
      `INSERT INTO studios (id, name, setup_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(SEEDED_STUDIO_ID, "Northstar Motion", "complete", now, now)

    const insertUser = db.prepare(
      `INSERT INTO users
       (id, studio_id, name, email, email_normalized, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertUser.run(
      "dev-admin",
      SEEDED_STUDIO_ID,
      "Avery Morgan",
      "admin@playblast.local",
      "admin@playblast.local",
      passwordHash,
      "admin",
      now,
      now,
    )
    insertUser.run(
      "dev-creative",
      SEEDED_STUDIO_ID,
      "Maya Chen",
      "maya@playblast.local",
      "maya@playblast.local",
      passwordHash,
      "creative",
      now,
      now,
    )
    insertUser.run(
      "dev-proofing",
      SEEDED_STUDIO_ID,
      "Jordan Bell",
      "jordan@playblast.local",
      "jordan@playblast.local",
      passwordHash,
      "proofing",
      now,
      now,
    )
    insertUser.run(
      "dev-account-executive",
      SEEDED_STUDIO_ID,
      "Taylor Brooks",
      "taylor@playblast.local",
      "taylor@playblast.local",
      passwordHash,
      "account_executive",
      now,
      now,
    )

    const insertLead = db.prepare(
      `INSERT INTO leads
       (id, name, company, email, phone, source, status, notes, lastContactedAt, replied, createdAt, updatedAt, studioId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertLead.run(
      "lead-kinetic",
      "Priya Shah",
      "Kinetic Audio",
      "priya@kineticaudio.example",
      "+1 415 555 0181",
      "Referral",
      "negotiating",
      "Interested in a quarterly launch package.",
      "2026-09-09T15:00:00.000Z",
      1,
      "2026-08-14T10:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )
    insertLead.run(
      "lead-fieldwork",
      "Lucas Wright",
      "Fieldwork Labs",
      "lucas@fieldwork.example",
      null,
      "Website",
      "replied",
      "Asked for a reel and rough range for a product film.",
      "2026-09-06T11:30:00.000Z",
      1,
      "2026-08-28T09:30:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )
    insertLead.run(
      "lead-summit",
      "Elena Rossi",
      "Summit House",
      "elena@summithouse.example",
      "+1 212 555 0144",
      "Conference",
      "contacted",
      "Follow up after the September brand workshop.",
      "2026-09-03T14:00:00.000Z",
      0,
      "2026-09-01T08:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )
    insertLead.run(
      "lead-arc",
      "Sam Okafor",
      "Arc & Alder",
      "sam@arcandalder.example",
      null,
      "Inbound",
      "new",
      "New inquiry for a holiday campaign.",
      null,
      0,
      "2026-09-10T16:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )
    insertLead.run(
      "lead-pine",
      "Noah Kim",
      "Pine & Co.",
      "noah@pineco.example",
      null,
      "Referral",
      "lost",
      "Budget moved to a later quarter.",
      "2026-08-22T10:00:00.000Z",
      0,
      "2026-08-05T12:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )

    const insertContactLog = db.prepare(
      `INSERT INTO contact_log (id, leadId, type, notes, contactedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    insertContactLog.run(
      "contact-kinetic-1",
      "lead-kinetic",
      "meeting",
      "Reviewed launch timeline and deliverable mix.",
      "2026-09-04T15:00:00.000Z",
      "2026-09-04T15:00:00.000Z",
    )
    insertContactLog.run(
      "contact-fieldwork-1",
      "lead-fieldwork",
      "email",
      "Sent reel and three relevant case studies.",
      "2026-09-06T11:30:00.000Z",
      "2026-09-06T11:30:00.000Z",
    )
    insertContactLog.run(
      "contact-summit-1",
      "lead-summit",
      "call",
      "Left a voicemail with proposed workshop dates.",
      "2026-09-03T14:00:00.000Z",
      "2026-09-03T14:00:00.000Z",
    )

    const insertClient = db.prepare(
      `INSERT INTO clients
       (id, name, company, email, phone, website, notes, convertedFromLeadId, isRetainer, retainerHours, retainerRate, retainerCycleDay, createdAt, updatedAt, studioId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertClient.run(
      "client-northstar",
      "Avery Morgan",
      "Northstar Records",
      "avery@northstar.example",
      "+1 310 555 0190",
      "https://northstar.example",
      "Primary contact for the launch and seasonal content work.",
      null,
      1,
      80,
      175,
      1,
      "2025-11-12T10:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )
    insertClient.run(
      "client-lumen",
      "Theo Grant",
      "Lumen Health",
      "theo@lumenhealth.example",
      "+1 646 555 0127",
      "https://lumenhealth.example",
      "Brand team prefers concise review rounds and annotated frames.",
      null,
      0,
      null,
      null,
      null,
      "2026-02-18T09:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )
    insertClient.run(
      "client-orbit",
      "Nadia Patel",
      "Orbit Objects",
      "nadia@orbitobjects.example",
      "+1 718 555 0175",
      "https://orbitobjects.example",
      "Product launch client. Reviewers are distributed across three time zones.",
      "lead-fieldwork",
      0,
      null,
      null,
      null,
      "2026-06-02T13:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )
    insertClient.run(
      "client-harbor",
      "June Park",
      "Harbor House",
      "june@harborhouse.example",
      null,
      "https://harborhouse.example",
      "Completed identity film project with a recurring social package.",
      null,
      0,
      null,
      null,
      null,
      "2025-07-20T11:00:00.000Z",
      now,
      SEEDED_STUDIO_ID,
    )

    db.prepare(
      `INSERT INTO retainer_cycle_hours
       (id, clientId, cycleStart, hoursLogged, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      "retainer-northstar-september",
      "client-northstar",
      "2026-09-01",
      46.5,
      now,
      now,
    )

    const insertService = db.prepare(
      `INSERT INTO services (id, name, hourEstimate, hourlyRate, type, createdAt, updatedAt, studioId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertService.run("service-product-film", "Product film", 48, 185, "animated", now, now, SEEDED_STUDIO_ID)
    insertService.run("service-brand-system", "Brand motion system", 32, 160, "animated", now, now, SEEDED_STUDIO_ID)
    insertService.run("service-social-cutdowns", "Social cutdowns", 12, 140, "animated", now, now, SEEDED_STUDIO_ID)
    insertService.run("service-color-grade", "Color grade", 8, 120, "static", now, now, SEEDED_STUDIO_ID)
    insertService.run("service-sound-design", "Sound design", 10, 150, "animated", now, now, SEEDED_STUDIO_ID)

    const insertProject = db.prepare(
      `INSERT INTO projects
       (id, name, createdAt, status, client, clientId, description, startDate, endDate, budget, notes, studioId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertProject.run(
      "project-northstar-launch",
      "Northstar launch film",
      "2026-07-08T09:00:00.000Z",
      "active",
      null,
      "client-northstar",
      "A tactile launch film and modular social toolkit for the fall record campaign.",
      "2026-07-15",
      "2026-10-02",
      JSON.stringify({ total: 72000, spent: 28500, currency: "USD" }),
      "Keep the product reveal quiet until the final sound mix is approved.",
      SEEDED_STUDIO_ID,
    )
    insertProject.run(
      "project-lumen-refresh",
      "Lumen brand refresh",
      "2026-05-20T09:00:00.000Z",
      "active",
      null,
      "client-lumen",
      "A refreshed motion identity for product education and conference films.",
      "2026-05-25",
      "2026-09-25",
      JSON.stringify({ total: 48000, spent: 32000, currency: "USD" }),
      "Client wants the approved system documented before final delivery.",
      SEEDED_STUDIO_ID,
    )
    insertProject.run(
      "project-orbit-objects",
      "Orbit objects launch",
      "2026-08-11T09:00:00.000Z",
      "on_hold",
      null,
      "client-orbit",
      "Short-form product films introducing the first Orbit Objects collection.",
      "2026-08-18",
      "2026-11-06",
      JSON.stringify({ total: 56000, spent: 12000, currency: "USD" }),
      "Awaiting final product samples before the next capture day.",
      SEEDED_STUDIO_ID,
    )
    insertProject.run(
      "project-harbor-identity",
      "Harbor House identity film",
      "2025-09-03T09:00:00.000Z",
      "completed",
      null,
      "client-harbor",
      "A finished identity film built from archival footage and new studio captures.",
      "2025-09-08",
      "2025-10-31",
      JSON.stringify({ total: 38500, spent: 38500, currency: "USD" }),
      "Archive final master and social exports after invoice reconciliation.",
      SEEDED_STUDIO_ID,
    )

    const insertProjectService = db.prepare(
      `INSERT INTO project_services
       (id, projectId, serviceId, quantity, overrideHours, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    insertProjectService.run("ps-northstar-film", "project-northstar-launch", "service-product-film", 1, null, now)
    insertProjectService.run("ps-northstar-social", "project-northstar-launch", "service-social-cutdowns", 2, null, now)
    insertProjectService.run("ps-northstar-sound", "project-northstar-launch", "service-sound-design", 1, null, now)
    insertProjectService.run("ps-lumen-system", "project-lumen-refresh", "service-brand-system", 1, null, now)
    insertProjectService.run("ps-lumen-grade", "project-lumen-refresh", "service-color-grade", 1, null, now)
    insertProjectService.run("ps-orbit-film", "project-orbit-objects", "service-product-film", 1, 40, now)
    insertProjectService.run("ps-orbit-grade", "project-orbit-objects", "service-color-grade", 1, null, now)
    insertProjectService.run("ps-harbor-social", "project-harbor-identity", "service-social-cutdowns", 3, null, now)
    insertProjectService.run("ps-harbor-sound", "project-harbor-identity", "service-sound-design", 1, null, now)

    const insertDeliverable = db.prepare(
      `INSERT INTO deliverables
       (id, projectId, name, description, status, dueDate, createdAt, "order")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertDeliverable.run("deliv-northstar-hero", "project-northstar-launch", "Hero film", "30-second launch film master.", "in_review", "2026-09-18", now, 1)
    insertDeliverable.run("deliv-northstar-social", "project-northstar-launch", "Social cutdowns", "Three vertical and square social exports.", "in_progress", "2026-09-25", now, 2)
    insertDeliverable.run("deliv-lumen-system", "project-lumen-refresh", "Motion system", "Documented title, transition, and end-card system.", "approved", "2026-09-12", now, 1)
    insertDeliverable.run("deliv-lumen-film", "project-lumen-refresh", "Conference film", "Two-minute product education film.", "approved", "2026-09-25", now, 2)
    insertDeliverable.run("deliv-orbit-teaser", "project-orbit-objects", "Launch teaser", "First look at the collection and materials.", "in_progress", "2026-10-09", now, 1)
    insertDeliverable.run("deliv-harbor-master", "project-harbor-identity", "Final identity film", "Approved final master.", "approved", "2025-10-31", now, 1)

    const insertMilestone = db.prepare(
      `INSERT INTO milestones (id, projectId, name, dueDate, done, "order", createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    insertMilestone.run("mile-northstar-lock", "project-northstar-launch", "Picture lock", "2026-09-18", 0, 1, now)
    insertMilestone.run("mile-northstar-delivery", "project-northstar-launch", "Delivery package", "2026-10-02", 0, 2, now)
    insertMilestone.run("mile-lumen-docs", "project-lumen-refresh", "System documentation", "2026-09-12", 1, 1, now)
    insertMilestone.run("mile-orbit-capture", "project-orbit-objects", "Capture day", "2026-09-26", 0, 1, now)
    insertMilestone.run("mile-harbor-archive", "project-harbor-identity", "Archive final masters", "2025-11-07", 1, 1, now)

    const insertTask = db.prepare(
      `INSERT INTO tasks (id, milestoneId, name, done, "order", createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    insertTask.run("task-northstar-edit", "mile-northstar-lock", "Address review notes", 0, 1, now)
    insertTask.run("task-northstar-mix", "mile-northstar-lock", "Approve final sound mix", 0, 2, now)
    insertTask.run("task-northstar-exports", "mile-northstar-delivery", "Render delivery exports", 0, 1, now)
    insertTask.run("task-lumen-guide", "mile-lumen-docs", "Publish motion guidelines", 1, 1, now)
    insertTask.run("task-orbit-samples", "mile-orbit-capture", "Confirm sample arrival", 0, 1, now)
    insertTask.run("task-harbor-backup", "mile-harbor-archive", "Back up project package", 1, 1, now)

    const insertTimeLog = db.prepare(
      `INSERT INTO time_logs (id, taskId, durationHours, loggedAt, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    insertTimeLog.run("time-northstar-edit-1", "task-northstar-edit", 6.5, "2026-09-08", "First pass through consolidated notes.", now)
    insertTimeLog.run("time-northstar-edit-2", "task-northstar-edit", 4, "2026-09-09", "Rebuilt the opening reveal.", now)
    insertTimeLog.run("time-northstar-mix-1", "task-northstar-mix", 2.5, "2026-09-10", "Mix review with composer.", now)
    insertTimeLog.run("time-lumen-guide-1", "task-lumen-guide", 7, "2026-09-04", "Finalized transition examples.", now)
    insertTimeLog.run("time-orbit-samples-1", "task-orbit-samples", 3, "2026-09-09", "Coordinated sample tracking.", now)

    const insertVersion = db.prepare(
      `INSERT INTO versions (id, projectId, deliverableId, label, filename, uploadedAt, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    insertVersion.run("version-northstar-v1", "project-northstar-launch", "deliv-northstar-hero", "v1", "northstar-hero-v1.mp4", "2026-09-01T12:00:00.000Z", "needs_revision")
    insertVersion.run("version-northstar-v2", "project-northstar-launch", "deliv-northstar-hero", "v2", "northstar-hero-v2.mp4", "2026-09-09T17:00:00.000Z", "pending_review")
    insertVersion.run("version-lumen-v3", "project-lumen-refresh", "deliv-lumen-system", "v3", "lumen-system-v3.mp4", "2026-09-05T14:00:00.000Z", "approved")
    insertVersion.run("version-orbit-v1", "project-orbit-objects", "deliv-orbit-teaser", "v1", "orbit-teaser-v1.mp4", "2026-08-22T10:00:00.000Z", "needs_revision")
    insertVersion.run("version-harbor-final", "project-harbor-identity", "deliv-harbor-master", "Final", "harbor-identity-final.mp4", "2025-10-31T16:00:00.000Z", "approved")

    const insertComment = db.prepare(
      `INSERT INTO comments
       (id, versionId, timestamp, body, author, authorUserId, createdAt, resolved, annotation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertComment.run("comment-northstar-1", "version-northstar-v2", 12.4, "The first reveal feels a beat too early. Can we let the room tone breathe before the cut?", "Jordan Bell", "dev-proofing", "2026-09-10T09:30:00.000Z", 0, null)
    insertComment.run("comment-northstar-2", "version-northstar-v2", 28.1, "This texture is working. Keep the grain level consistent through the title card.", "Maya Chen", "dev-creative", "2026-09-10T10:15:00.000Z", 1, JSON.stringify({ timestamp: 28.1, shapes: [{ id: "shape-1", type: "arrow", color: "#f97316", strokeWidth: 4, points: [61, 38, 75, 49] }], viewportWidth: 1920, viewportHeight: 1080 }))
    insertComment.run("comment-lumen-1", "version-lumen-v3", 44.8, "Approved. Please use this transition as the reference in the handoff guide.", "Theo Grant", null, "2026-09-06T13:00:00.000Z", 1, null)
    insertComment.run("comment-orbit-1", "version-orbit-v1", 8.2, "The highlight is clipping on the upper edge of the object. Revisit after the new samples arrive.", "Avery Morgan", "dev-admin", "2026-08-23T11:00:00.000Z", 0, null)

    const insertInvoice = db.prepare(
      `INSERT INTO invoices
       (id, invoiceNumber, projectId, clientId, projectName, clientName, clientCompany, clientEmail, currency, grandTotal, lineItems, invoiceDate, dueDate, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insertInvoice.run(
      "invoice-northstar-001",
      1001,
      "project-northstar-launch",
      "client-northstar",
      "Northstar launch film",
      "Avery Morgan",
      "Northstar Records",
      "avery@northstar.example",
      "USD",
      46200,
      JSON.stringify([{ serviceName: "Product film", hours: 48, hourlyRate: 185, lineTotal: 8880 }, { serviceName: "Social cutdowns", hours: 24, hourlyRate: 140, lineTotal: 3360 }, { serviceName: "Sound design", hours: 10, hourlyRate: 150, lineTotal: 1500 }]),
      "2026-09-01",
      "2026-10-01",
      "unpaid",
      now,
    )
    insertInvoice.run(
      "invoice-lumen-001",
      1002,
      "project-lumen-refresh",
      "client-lumen",
      "Lumen brand refresh",
      "Theo Grant",
      "Lumen Health",
      "theo@lumenhealth.example",
      "USD",
      6080,
      JSON.stringify([{ serviceName: "Brand motion system", hours: 32, hourlyRate: 160, lineTotal: 5120 }, { serviceName: "Color grade", hours: 8, hourlyRate: 120, lineTotal: 960 }]),
      "2026-08-15",
      "2026-09-15",
      "partially_paid",
      now,
    )
    insertInvoice.run(
      "invoice-harbor-001",
      1003,
      "project-harbor-identity",
      "client-harbor",
      "Harbor House identity film",
      "June Park",
      "Harbor House",
      "june@harborhouse.example",
      "USD",
      6000,
      JSON.stringify([{ serviceName: "Social cutdowns", hours: 36, hourlyRate: 140, lineTotal: 5040 }, { serviceName: "Sound design", hours: 6.4, hourlyRate: 150, lineTotal: 960 }]),
      "2025-11-01",
      "2025-12-01",
      "paid",
      now,
    )

    const insertPayment = db.prepare(
      `INSERT INTO invoice_payments (id, invoiceId, amount, paidAt, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    insertPayment.run("payment-lumen-1", "invoice-lumen-001", 3000, "2026-09-01", "Deposit received.", now)
    insertPayment.run("payment-harbor-1", "invoice-harbor-001", 6000, "2025-11-28", "Paid by bank transfer.", now)

  })()

  ensureDevelopmentDemoVideos(uploadDir)
  return true
}
