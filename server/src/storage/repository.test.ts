import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import Database from "better-sqlite3"
import {
  convertLeadToClient,
  createComment,
  createContactLog,
  createClient,
  createDeliverable,
  createLead,
  createMilestone,
  createProject,
  createService,
  createVersion,
  deleteClient,
  deleteComment,
  deleteContactLog,
  deleteDeliverable,
  deleteLead,
  deleteMilestone,
  deleteProject,
  duplicateProject,
  deleteService,
  ensureProject,
  getClient,
  getClientWithProjects,
  getComment,
  getContactLog,
  getDeliverable,
  getLead,
  getLeadWithContactLog,
  getMilestone,
  getProject,
  getService,
  getServiceProjectUsage,
  getVersionByLabel,
  listClients,
  listComments,
  listContactLog,
  listDeliverables,
  listDeliverableSummaries,
  listLeads,
  listMilestones,
  listProjectServices,
  listProjectSummaries,
  listProjects,
  listServices,
  addProjectService,
  linkServiceToProject,
  removeProjectService,
  updateProjectService,
  listVersions,
  updateClient,
  updateComment,
  updateDeliverable,
  updateLead,
  updateMilestone,
  updateProject,
  updateService,
  updateVersionLabel,
  updateVersionStatus,
} from "./repository.js"
import { closeDatabase, getDbPath, initDatabase } from "./db.js"

let tempDir = ""
let dbPath = ""

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-data-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  initDatabase(dbPath)
})

after(() => {
  closeDatabase()
  delete process.env.DB_PATH
  fs.rmSync(tempDir, { recursive: true, force: true })
})

function setupDeliverable(projectId: string, name = "Hero Spot") {
  const project = ensureProject(projectId)
  const deliverable = createDeliverable({ projectId: project.id, name })
  return { project, deliverable }
}

describe("SQLite data store", () => {
  it("persists projects, deliverables, versions, and comments to SQLite", () => {
    const project = createProject({ id: "demo", name: "Demo Project" })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Launch Film",
    })
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "render.mp4",
    })
    const comment = createComment({
      versionId: version.id,
      timestamp: 12.5,
      body: "Adjust exposure",
      author: "Alex",
    })

    assert.equal(listProjects().length, 1)
    assert.equal(listDeliverables(project.id).length, 1)
    assert.equal(listVersions(deliverable.id).length, 1)
    assert.equal(listComments(version.id).length, 1)
    assert.equal(comment.resolved, false)

    const storePath = getDbPath()
    assert.equal(fs.existsSync(storePath), true)

    const db = new Database(storePath, { readonly: true })
    const projectCount = db
      .prepare("SELECT COUNT(*) AS count FROM projects")
      .get() as { count: number }
    const deliverableCount = db
      .prepare("SELECT COUNT(*) AS count FROM deliverables")
      .get() as { count: number }
    const versionCount = db
      .prepare("SELECT COUNT(*) AS count FROM versions")
      .get() as { count: number }
    const commentCount = db
      .prepare("SELECT COUNT(*) AS count FROM comments")
      .get() as { count: number }
    db.close()

    assert.equal(projectCount.count, 1)
    assert.equal(deliverableCount.count, 1)
    assert.equal(versionCount.count, 1)
    assert.equal(commentCount.count, 1)

    const projectRow = listProjects()[0]
    const deliverableRow = listDeliverables(project.id)[0]
    const versionRow = listVersions(deliverable.id)[0]
    const commentRow = listComments(version.id)[0]

    assert.equal(projectRow?.id, "demo")
    assert.equal(deliverableRow?.name, "Launch Film")
    assert.equal(versionRow?.label, "v1")
    assert.equal(commentRow?.body, "Adjust exposure")
  })

  it("creates projects with management defaults and updatable fields", () => {
    const project = createProject({ id: "pm-defaults", name: "PM Defaults" })
    assert.equal(project.status, "active")

    const updated = updateProject(project.id, {
      status: "on_hold",
      client: "BRZRK",
      startDate: "2026-01-01",
      endDate: "2026-03-01",
      budget: { total: 50000, currency: "USD", spent: 12000 },
    })

    assert.equal(updated?.status, "on_hold")
    assert.equal(updated?.client, "BRZRK")
    assert.equal(updated?.budget?.total, 50000)
    assert.equal(updated?.budget?.spent, 12000)

    const cleared = updateProject(project.id, { client: null, budget: null })
    assert.equal(cleared?.client, undefined)
    assert.equal(cleared?.budget, undefined)
  })

  it("updates an existing version when re-uploading the same label", () => {
    const { deliverable, project } = setupDeliverable("reupload-test")
    const first = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v2",
      filename: "first.mp4",
    })
    const second = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v2",
      filename: "second.mp4",
    })

    assert.equal(first.id, second.id)
    assert.equal(second.filename, "second.mp4")
    assert.equal(listVersions(deliverable.id).length, 1)
  })

  it("resets version status to pending_review when re-uploading", () => {
    const { deliverable, project } = setupDeliverable("reupload-status-test")
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "first.mp4",
    })

    updateVersionStatus(version.id, "approved")
    assert.equal(getVersionByLabel(deliverable.id, "v1")?.status, "approved")

    const reuploaded = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "second.mp4",
    })

    assert.equal(reuploaded.id, version.id)
    assert.equal(reuploaded.status, "pending_review")
  })

  it("updates and deletes comments", () => {
    const { deliverable, project } = setupDeliverable("comment-test")
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })
    const comment = createComment({
      versionId: version.id,
      timestamp: 3,
      body: "Needs work",
      author: "Jordan",
    })

    const updated = updateComment(comment.id, {
      body: "Resolved in v2",
      resolved: true,
    })

    assert.equal(updated?.body, "Resolved in v2")
    assert.equal(updated?.resolved, true)
    assert.equal(getComment(comment.id)?.resolved, true)

    assert.equal(deleteComment(comment.id), true)
    assert.equal(listComments(version.id).length, 0)
    assert.equal(deleteComment(comment.id), false)
  })

  it("summarizes projects with deliverable and version counts", () => {
    const project = createProject({ id: "summary-test", name: "Summary Test" })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Sizzle",
    })
    createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })

    const summaries = listProjectSummaries()
    const summary = summaries.find((item) => item.id === "summary-test")

    assert.ok(summary)
    assert.equal(summary.deliverableCount, 1)
    assert.equal(summary.versionCount, 1)
    assert.ok(summary.updatedAt >= project.createdAt)
    assert.equal(summary.openCommentCount, 0)
    assert.equal(summary.status, "active")
    assert.equal(summary.deliverableStatusCounts.not_started, 1)
  })

  it("rolls up deliverable status counts and the next milestone", () => {
    const project = createProject({ id: "rollup-test", name: "Rollup Test" })
    const a = createDeliverable({ projectId: project.id, name: "A" })
    createDeliverable({ projectId: project.id, name: "B" })
    updateDeliverable(a.id, { status: "approved" })

    createMilestone({
      projectId: project.id,
      name: "Final cut",
      dueDate: "2026-05-01",
    })
    createMilestone({
      projectId: project.id,
      name: "First cut",
      dueDate: "2026-04-01",
    })

    const summary = listProjectSummaries().find((item) => item.id === project.id)
    assert.ok(summary)
    assert.equal(summary.deliverableStatusCounts.approved, 1)
    assert.equal(summary.deliverableStatusCounts.not_started, 1)
    assert.equal(summary.nextMilestone?.name, "First cut")
  })

  it("counts open comments across all project deliverables", () => {
    const project = createProject({ id: "open-count-test", name: "Open Count Test" })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Cutdown",
    })
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })
    const openComment = createComment({
      versionId: version.id,
      timestamp: 1,
      body: "Open",
      author: "Alex",
    })
    const resolvedComment = createComment({
      versionId: version.id,
      timestamp: 2,
      body: "Done",
      author: "Sam",
    })
    updateComment(resolvedComment.id, { resolved: true })

    const summary = listProjectSummaries().find((item) => item.id === project.id)
    assert.ok(summary)
    assert.equal(summary.openCommentCount, 1)
    assert.equal(openComment.resolved, false)
  })

  it("includes linked client name and services estimate in project summaries", () => {
    const client = createClient({
      name: "Jane Doe",
      email: "jane@example.com",
      company: "Acme Co",
    })
    const project = createProject({
      id: "summary-client-estimate",
      name: "Summary Client Estimate",
      clientId: client.id,
      budget: { total: 10_000, currency: "USD" },
    })
    const service = createService({
      name: "Brand Film",
      hourEstimate: 10,
      hourlyRate: 420,
      type: "animated",
    })

    addProjectService(project.id, service.id)

    const summary = listProjectSummaries().find((item) => item.id === project.id)
    assert.ok(summary)
    assert.equal(summary.clientName, "Acme Co")
    assert.equal(summary.servicesEstimate, 4200)
    assert.equal(summary.servicesEstimatedHours, 10)

    const bare = createProject({ id: "summary-bare", name: "Bare Project" })
    const bareSummary = listProjectSummaries().find((item) => item.id === bare.id)
    assert.ok(bareSummary)
    assert.equal(bareSummary.clientName, undefined)
    assert.equal(bareSummary.servicesEstimate, undefined)
    assert.equal(bareSummary.servicesEstimatedHours, undefined)

    removeProjectService(project.id, service.id)
    deleteProject(project.id)
    deleteProject(bare.id)
    deleteService(service.id)
    deleteClient(client.id)
  })

  it("duplicates a project with services and milestones but clears dates and client", () => {
    const client = createClient({
      name: "Copy Client",
      email: "copy@example.com",
    })
    const service = createService({
      name: "Motion Design",
      hourEstimate: 12,
      hourlyRate: 200,
      type: "animated",
    })
    const source = createProject({
      id: "copy-source",
      name: "Source Project",
      status: "completed",
      clientId: client.id,
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      budget: { total: 50_000, currency: "USD", spent: 10_000 },
      description: "Keep this description",
    })
    const deliverable = createDeliverable({
      projectId: source.id,
      name: "Hero Spot",
    })
    createVersion({
      projectId: source.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "hero.mp4",
    })
    addProjectService(source.id, service.id, 2)
    updateProjectService(source.id, service.id, { overrideHours: 15 })
    createMilestone({
      projectId: source.id,
      name: "Kickoff",
      dueDate: "2026-02-01",
      done: true,
    })
    createMilestone({
      projectId: source.id,
      name: "Delivery",
      dueDate: "2026-05-01",
    })

    const copy = duplicateProject(source.id)
    assert.ok(copy)
    assert.notEqual(copy.id, source.id)
    assert.equal(copy.name, "Source Project (Copy)")
    assert.equal(copy.status, "active")
    assert.equal(copy.description, "Keep this description")
    assert.equal(copy.clientId, undefined)
    assert.equal(copy.startDate, undefined)
    assert.equal(copy.endDate, undefined)
    assert.equal(copy.budget, undefined)

    assert.equal(listDeliverables(copy.id).length, 0)

    const copiedServices = listProjectServices(copy.id)
    assert.equal(copiedServices.length, 1)
    assert.equal(copiedServices[0]?.serviceId, service.id)
    assert.equal(copiedServices[0]?.quantity, 2)
    assert.equal(copiedServices[0]?.overrideHours, 15)

    const copiedMilestones = listMilestones(copy.id)
    assert.equal(copiedMilestones.length, 2)
    assert.equal(copiedMilestones.every((milestone) => !milestone.done), true)
    assert.equal(
      copiedMilestones.every((milestone) => milestone.dueDate === undefined),
      true,
    )
    assert.deepEqual(
      copiedMilestones.map((milestone) => milestone.name),
      ["Kickoff", "Delivery"],
    )

    assert.equal(duplicateProject("missing-project"), undefined)

    deleteProject(copy.id)
    deleteProject(source.id)
    deleteService(service.id)
    deleteClient(client.id)
  })

  it("summarizes deliverables with version and comment rollups", () => {
    const project = createProject({ id: "deliv-summary", name: "Deliverable Summary" })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Trailer",
    })
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })
    updateVersionStatus(version.id, "approved")
    createComment({
      versionId: version.id,
      timestamp: 1,
      body: "Open note",
      author: "Alex",
    })

    const summaries = listDeliverableSummaries(project.id)
    assert.equal(summaries.length, 1)
    assert.equal(summaries[0]?.versionCount, 1)
    assert.equal(summaries[0]?.openCommentCount, 1)
    assert.equal(summaries[0]?.latestVersionStatus, "approved")
  })

  it("manages milestones", () => {
    const project = createProject({ id: "milestone-test", name: "Milestone Test" })
    const milestone = createMilestone({
      projectId: project.id,
      name: "Kickoff",
      dueDate: "2026-02-01",
    })

    assert.equal(milestone.done, false)
    assert.equal(listMilestones(project.id).length, 1)

    const updated = updateMilestone(milestone.id, { done: true })
    assert.equal(updated?.done, true)
    assert.equal(getMilestone(milestone.id)?.done, true)

    assert.equal(deleteMilestone(milestone.id), true)
    assert.equal(listMilestones(project.id).length, 0)
  })

  it("deletes a deliverable and cascades versions and comments", () => {
    const project = createProject({ id: "deliv-delete", name: "Deliverable Delete" })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Promo",
    })
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })
    createComment({
      versionId: version.id,
      timestamp: 2,
      body: "Remove me",
      author: "Alex",
    })

    assert.equal(deleteDeliverable(deliverable.id), true)
    assert.equal(getDeliverable(deliverable.id), undefined)
    assert.equal(listVersions(deliverable.id).length, 0)
    assert.equal(listComments(version.id).length, 0)
  })

  it("deletes a project and cascades deliverables, versions, comments, milestones", () => {
    const project = createProject({ id: "delete-test", name: "Delete Test" })
    const deliverable = createDeliverable({
      projectId: project.id,
      name: "Spot",
    })
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })
    createComment({
      versionId: version.id,
      timestamp: 2,
      body: "Remove me",
      author: "Alex",
    })
    createMilestone({ projectId: project.id, name: "Wrap" })

    assert.equal(deleteProject(project.id), true)
    assert.equal(listDeliverables(project.id).length, 0)
    assert.equal(listVersions(deliverable.id).length, 0)
    assert.equal(listComments(version.id).length, 0)
    assert.equal(listMilestones(project.id).length, 0)
    assert.equal(deleteProject(project.id), false)
  })

  it("defaults new versions to pending_review and updates status", () => {
    const { deliverable, project } = setupDeliverable("status-test")
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })

    assert.equal(version.status, "pending_review")

    const approved = updateVersionStatus(version.id, "approved")
    assert.equal(approved?.status, "approved")
    assert.equal(getVersionByLabel(deliverable.id, "v1")?.status, "approved")

    const revision = updateVersionStatus(version.id, "needs_revision")
    assert.equal(revision?.status, "needs_revision")
    assert.equal(updateVersionStatus("missing-id", "approved"), undefined)
  })

  it("looks up versions by deliverable id and label", () => {
    const { deliverable, project } = setupDeliverable("lookup-test")
    createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v3",
      filename: "take.mp4",
    })

    const version = getVersionByLabel(deliverable.id, "v3")
    assert.ok(version)
    assert.equal(version.deliverableId, deliverable.id)
  })

  it("renames a version label and rejects conflicts", () => {
    const { deliverable, project } = setupDeliverable("rename-test")
    const version = createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v1",
      filename: "clip.mp4",
    })
    createVersion({
      projectId: project.id,
      deliverableId: deliverable.id,
      label: "v2",
      filename: "other.mp4",
    })

    const renamed = updateVersionLabel(version.id, "v1-final")
    assert.notEqual(renamed, "not_found")
    assert.notEqual(renamed, "conflict")
    if (typeof renamed === "string") {
      assert.fail("expected version object")
    }

    assert.equal(renamed.label, "v1-final")
    assert.equal(getVersionByLabel(deliverable.id, "v1-final")?.id, version.id)
    assert.equal(updateVersionLabel(version.id, "v2"), "conflict")
    assert.equal(updateVersionLabel("missing-id", "v9"), "not_found")
  })

  it("persists leads, filters them, and manages contact log side effects", () => {
    const lead = createLead({
      name: "Jordan Ellis",
      email: "jordan@example.com",
      company: "Northlight",
      status: "new",
    })

    const otherLead = createLead({
      name: "Sam Rivera",
      email: "sam@example.com",
      status: "contacted",
      replied: true,
    })

    assert.equal(listLeads().length, 2)
    assert.equal(listLeads({ status: "new" }).length, 1)
    assert.equal(listLeads({ replied: false }).length, 1)
    assert.equal(listLeads({ replied: true }).length, 1)

    const entry = createContactLog({
      leadId: lead.id,
      type: "email",
      notes: "Intro email sent.",
      contactedAt: "2026-06-10T10:00:00.000Z",
    })

    const updatedLead = getLead(lead.id)
    assert.ok(updatedLead)
    assert.equal(updatedLead.lastContactedAt, "2026-06-10T10:00:00.000Z")
    assert.equal(updatedLead.replied, false)

    createContactLog({
      leadId: lead.id,
      type: "call",
      notes: "Lead replied on the call.",
      contactedAt: "2026-06-11T14:00:00.000Z",
      indicatesResponse: true,
    })

    const repliedLead = getLead(lead.id)
    assert.ok(repliedLead)
    assert.equal(repliedLead.replied, true)
    assert.equal(listContactLog(lead.id).length, 2)

    const withLog = getLeadWithContactLog(lead.id)
    assert.ok(withLog)
    assert.equal(withLog.contactLog.length, 2)
    assert.ok(withLog.contactLog.some((item) => item.id === entry.id))

    const patched = updateLead(lead.id, {
      status: "negotiating",
      notes: "Budget discussion underway.",
    })
    assert.equal(patched?.status, "negotiating")

    assert.ok(deleteContactLog(entry.id))
    assert.equal(getContactLog(entry.id), undefined)
    assert.ok(deleteLead(otherLead.id))
    assert.equal(getLead(otherLead.id), undefined)
  })

  it("persists clients, converts leads, and blocks delete when projects are linked", () => {
    const lead = createLead({
      name: "Avery Chen",
      email: "avery@example.com",
      company: "Lumen Co",
      phone: "555-0100",
      status: "negotiating",
    })

    const converted = convertLeadToClient(lead.id)
    assert.notEqual(converted, "not_found")
    assert.notEqual(converted, "already_converted")

    if (typeof converted === "string") {
      throw new Error("expected converted client")
    }

    assert.equal(converted.name, "Avery Chen")
    assert.equal(converted.company, "Lumen Co")
    assert.equal(converted.email, "avery@example.com")
    assert.equal(converted.phone, "555-0100")
    assert.equal(converted.convertedFromLeadId, lead.id)
    assert.equal(getLead(lead.id)?.status, "converted")
    assert.equal(convertLeadToClient(lead.id), "already_converted")

    const notesLead = createLead({
      name: "Notes Lead",
      email: "notes@example.com",
      status: "contacted",
    })
    const withNotes = convertLeadToClient(notesLead.id, {
      notes: "VIP referral from partner",
    })
    assert.notEqual(typeof withNotes, "string")
    if (typeof withNotes === "string") {
      throw new Error("expected converted client with notes")
    }
    assert.equal(withNotes.notes, "VIP referral from partner")

    const manual = createClient({
      name: "Manual Client",
      email: "manual@example.com",
      website: "https://example.com",
    })

    assert.equal(listClients().length, 3)
    assert.equal(getClient(manual.id)?.website, "https://example.com")

    const withProjects = getClientWithProjects(manual.id)
    assert.ok(withProjects)
    assert.equal(withProjects.projects.length, 0)

    createProject({
      id: "proj-client",
      name: "Linked Project",
      clientId: manual.id,
      status: "active",
    })

    assert.equal(getClientWithProjects(manual.id)?.projects.length, 1)
    assert.equal(deleteClient(manual.id), "has_active_projects")

    updateProject("proj-client", { status: "archived" })
    assert.equal(deleteClient(manual.id), "deleted")
    assert.equal(getProject("proj-client")?.clientId, undefined)

    const patched = updateClient(converted.id, {
      notes: "Converted account.",
      phone: null,
    })
    assert.equal(patched?.notes, "Converted account.")
    assert.equal(patched?.phone, undefined)
  })

  it("creates, updates, lists, and hard-deletes services", () => {
    const staticService = createService({
      name: "Logo Design",
      hourEstimate: 4,
      hourlyRate: 150,
      type: "static",
    })

    createService({
      name: "Motion Intro",
      hourEstimate: 12,
      hourlyRate: 175,
      type: "animated",
    })

    assert.equal(listServices().length, 2)
    assert.equal(getService(staticService.id)?.type, "static")

    const updated = updateService(staticService.id, {
      name: "Brand Logo Package",
      hourEstimate: 6,
      hourlyRate: 160,
      type: "static",
    })
    assert.equal(updated?.name, "Brand Logo Package")
    assert.equal(updated?.hourEstimate, 6)

    assert.equal(deleteService(staticService.id), "deleted")
    assert.equal(getService(staticService.id), undefined)
    assert.equal(deleteService(staticService.id), "not_found")
    assert.equal(listServices().length, 1)
  })

  it("reports linked projects for service usage", () => {
    const service = createService({
      name: "Brand Film",
      hourEstimate: 40,
      hourlyRate: 200,
      type: "animated",
    })
    const alpha = createProject({ name: "Alpha Campaign" })
    const beta = createProject({ name: "Beta Launch" })

    linkServiceToProject(alpha.id, service.id)
    linkServiceToProject(beta.id, service.id)

    const usage = getServiceProjectUsage(service.id)
    assert.equal(usage?.projectCount, 2)
    assert.deepEqual(
      usage?.projects.map((project) => project.name),
      ["Alpha Campaign", "Beta Launch"],
    )
    assert.equal(getServiceProjectUsage("missing-service"), undefined)
  })

  it("manages project service links with quantity", () => {
    const service = createService({
      name: "Explainer Video",
      hourEstimate: 20,
      hourlyRate: 180,
      type: "animated",
    })
    const project = createProject({ name: "Explainer Campaign" })

    const attached = addProjectService(project.id, service.id, 3)
    assert.notEqual(attached, "already_linked")
    if (typeof attached === "string") {
      throw new Error(`Unexpected result: ${attached}`)
    }
    assert.equal(attached.quantity, 3)
    assert.equal(attached.service.name, "Explainer Video")

    assert.equal(addProjectService(project.id, service.id), "already_linked")

    const listed = listProjectServices(project.id)
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.quantity, 3)

    assert.equal(removeProjectService(project.id, service.id), "removed")
    assert.equal(removeProjectService(project.id, service.id), "not_found")
    assert.equal(getService(service.id)?.name, "Explainer Video")
    assert.equal(listProjectServices(project.id).length, 0)
  })

  it("stores and clears project-level hour overrides", () => {
    const service = createService({
      name: "Brand Guide",
      hourEstimate: 5,
      hourlyRate: 120,
      type: "static",
    })
    const project = createProject({ name: "Brand Refresh" })

    addProjectService(project.id, service.id)

    const listed = listProjectServices(project.id)
    assert.equal(listed[0]?.overrideHours, null)
    assert.equal(listed[0]?.service.hourEstimate, 5)

    const updated = updateProjectService(project.id, service.id, {
      overrideHours: 7.5,
    })
    if (typeof updated === "string") {
      throw new Error(`Unexpected result: ${updated}`)
    }
    assert.equal(updated.overrideHours, 7.5)
    assert.equal(updated.service.hourEstimate, 5)
    assert.equal(getService(service.id)?.hourEstimate, 5)

    const reset = updateProjectService(project.id, service.id, {
      overrideHours: null,
    })
    if (typeof reset === "string") {
      throw new Error(`Unexpected result: ${reset}`)
    }
    assert.equal(reset.overrideHours, null)
    assert.equal(updateProjectService(project.id, "missing", { overrideHours: 4 }), "not_found")
  })
})
