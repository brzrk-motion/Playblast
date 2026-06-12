import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  createComment,
  createDeliverable,
  createMilestone,
  createProject,
  createVersion,
  deleteComment,
  deleteDeliverable,
  deleteMilestone,
  deleteProject,
  ensureProject,
  getComment,
  getDeliverable,
  getMilestone,
  getVersionByLabel,
  listComments,
  listDeliverables,
  listDeliverableSummaries,
  listMilestones,
  listProjectSummaries,
  listProjects,
  listVersions,
  updateComment,
  updateDeliverable,
  updateMilestone,
  updateProject,
  updateVersionLabel,
  updateVersionStatus,
} from "./repository.js"
import { getStorePath } from "./json-store.js"

let tempDir = ""

before(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-data-"))
  process.env.PLAYBLAST_DATA_DIR = tempDir
})

after(() => {
  delete process.env.PLAYBLAST_DATA_DIR
  fs.rmSync(tempDir, { recursive: true, force: true })
})

function setupDeliverable(projectId: string, name = "Hero Spot") {
  const project = ensureProject(projectId)
  const deliverable = createDeliverable({ projectId: project.id, name })
  return { project, deliverable }
}

describe("JSON data store", () => {
  it("persists projects, deliverables, versions, and comments to store.json", () => {
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

    const storePath = getStorePath()
    assert.equal(fs.existsSync(storePath), true)

    const persisted = JSON.parse(fs.readFileSync(storePath, "utf8")) as {
      projects: Array<{ id: string }>
      deliverables: Array<{ name: string }>
      versions: Array<{ label: string }>
      comments: Array<{ body: string }>
    }

    assert.equal(persisted.projects[0]?.id, "demo")
    assert.equal(persisted.deliverables[0]?.name, "Launch Film")
    assert.equal(persisted.versions[0]?.label, "v1")
    assert.equal(persisted.comments[0]?.body, "Adjust exposure")
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
})
