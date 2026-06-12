import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  createComment,
  createProject,
  createVersion,
  deleteComment,
  deleteProject,
  ensureProject,
  getComment,
  getProject,
  getVersionByLabel,
  listComments,
  listProjectSummaries,
  listProjects,
  listVersions,
  updateComment,
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

describe("JSON data store", () => {
  it("persists projects, versions, and comments to store.json", () => {
    const project = createProject({ id: "demo", name: "Demo Project" })
    const version = createVersion({
      projectId: project.id,
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
    assert.equal(listVersions(project.id).length, 1)
    assert.equal(listComments(version.id).length, 1)
    assert.equal(comment.resolved, false)

    const storePath = getStorePath()
    assert.equal(fs.existsSync(storePath), true)

    const persisted = JSON.parse(fs.readFileSync(storePath, "utf8")) as {
      projects: Array<{ id: string }>
      versions: Array<{ label: string }>
      comments: Array<{ body: string }>
    }

    assert.equal(persisted.projects[0]?.id, "demo")
    assert.equal(persisted.versions[0]?.label, "v1")
    assert.equal(persisted.comments[0]?.body, "Adjust exposure")
  })

  it("updates an existing version when re-uploading the same label", () => {
    const project = ensureProject("reupload-test")
    const first = createVersion({
      projectId: project.id,
      label: "v2",
      filename: "first.mp4",
    })
    const second = createVersion({
      projectId: project.id,
      label: "v2",
      filename: "second.mp4",
    })

    assert.equal(first.id, second.id)
    assert.equal(second.filename, "second.mp4")
    assert.equal(listVersions(project.id).length, 1)
  })

  it("updates and deletes comments", () => {
    const project = ensureProject("comment-test")
    const version = createVersion({
      projectId: project.id,
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

  it("summarizes projects with version counts and updated dates", () => {
    const project = createProject({ id: "summary-test", name: "Summary Test" })
    createVersion({
      projectId: project.id,
      label: "v1",
      filename: "clip.mp4",
    })

    const summaries = listProjectSummaries()
    const summary = summaries.find((item) => item.id === "summary-test")

    assert.ok(summary)
    assert.equal(summary.versionCount, 1)
    assert.ok(summary.updatedAt >= project.createdAt)
  })

  it("deletes a project and cascades versions and comments", () => {
    const project = createProject({ id: "delete-test", name: "Delete Test" })
    const version = createVersion({
      projectId: project.id,
      label: "v1",
      filename: "clip.mp4",
    })
    createComment({
      versionId: version.id,
      timestamp: 2,
      body: "Remove me",
      author: "Alex",
    })

    assert.equal(deleteProject(project.id), true)
    assert.equal(getProject(project.id), undefined)
    assert.equal(listVersions(project.id).length, 0)
    assert.equal(listComments(version.id).length, 0)
    assert.equal(deleteProject(project.id), false)
  })

  it("defaults new versions to pending_review and updates status", () => {
    const project = ensureProject("status-test")
    const version = createVersion({
      projectId: project.id,
      label: "v1",
      filename: "clip.mp4",
    })

    assert.equal(version.status, "pending_review")

    const approved = updateVersionStatus(version.id, "approved")
    assert.equal(approved?.status, "approved")
    assert.equal(getVersionByLabel(project.id, "v1")?.status, "approved")

    const revision = updateVersionStatus(version.id, "needs_revision")
    assert.equal(revision?.status, "needs_revision")
    assert.equal(updateVersionStatus("missing-id", "approved"), undefined)
  })

  it("looks up versions by project id and label", () => {
    const project = ensureProject("lookup-test")
    createVersion({
      projectId: project.id,
      label: "v3",
      filename: "take.mp4",
    })

    const version = getVersionByLabel(project.id, "v3")
    assert.ok(version)
    assert.equal(version.projectId, project.id)
  })
})
