import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-api-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  initDatabase(dbPath)

  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server")
  }

  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  delete process.env.DB_PATH
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

async function createProject(id: string, name: string, extra: object = {}) {
  const response = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name, ...extra }),
  })
  return response
}

async function createDeliverable(projectId: string, name: string) {
  const response = await fetch(
    `${baseUrl}/api/projects/${projectId}/deliverables`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  )
  return (await response.json()) as { id: string; name: string; status: string }
}

async function createVersion(
  projectId: string,
  deliverableId: string,
  label: string,
) {
  const { createVersion: repoCreateVersion } = await import(
    "../storage/repository.js"
  )
  return repoCreateVersion({
    projectId,
    deliverableId,
    label,
    filename: "render.mp4",
  })
}

describe("projects, deliverables, milestones, versions, and comments API", () => {
  it("creates a project with management defaults", async () => {
    const createResponse = await createProject("spot-a", "Spot A", {
      client: "BRZRK",
      status: "active",
      budget: { total: 25000, currency: "USD" },
    })

    assert.equal(createResponse.status, 201)
    const project = (await createResponse.json()) as {
      id: string
      name: string
      status: string
      client: string
      budget: { total: number }
    }
    assert.equal(project.id, "spot-a")
    assert.equal(project.status, "active")
    assert.equal(project.client, "BRZRK")
    assert.equal(project.budget.total, 25000)
  })

  it("rejects an invalid project status on create", async () => {
    const response = await createProject("spot-bad-status", "Bad", {
      status: "wip",
    })
    assert.equal(response.status, 400)
  })

  it("gets a project by id and returns 404 when missing", async () => {
    await createProject("spot-get", "Spot Get")

    const getResponse = await fetch(`${baseUrl}/api/projects/spot-get`)
    assert.equal(getResponse.status, 200)
    const project = (await getResponse.json()) as { id: string }
    assert.equal(project.id, "spot-get")

    const missingResponse = await fetch(`${baseUrl}/api/projects/missing-id`)
    assert.equal(missingResponse.status, 404)
  })

  it("updates a project via PATCH", async () => {
    await createProject("spot-patch", "Spot Patch")

    const patchResponse = await fetch(`${baseUrl}/api/projects/spot-patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        client: "Acme",
        budget: { total: 10000, currency: "usd", spent: 5000 },
      }),
    })

    assert.equal(patchResponse.status, 200)
    const updated = (await patchResponse.json()) as {
      status: string
      client: string
      budget: { total: number; currency: string; spent: number }
    }
    assert.equal(updated.status, "completed")
    assert.equal(updated.client, "Acme")
    assert.equal(updated.budget.currency, "USD")
    assert.equal(updated.budget.spent, 5000)

    const notesResponse = await fetch(`${baseUrl}/api/projects/spot-patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Internal creative direction.",
      }),
    })
    assert.equal(notesResponse.status, 200)
    const withNotes = (await notesResponse.json()) as { notes: string }
    assert.equal(withNotes.notes, "Internal creative direction.")

    const invalid = await fetch(`${baseUrl}/api/projects/spot-patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "nope" }),
    })
    assert.equal(invalid.status, 400)
  })

  it("links projects to clients via POST, PATCH, GET detail, and list filter", async () => {
    const clientResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Acme Corp",
        email: "contact@acme.example",
        company: "Acme",
      }),
    })
    assert.equal(clientResponse.status, 201)
    const client = (await clientResponse.json()) as { id: string; name: string }

    const otherClientResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Other Co",
        email: "other@example.com",
      }),
    })
    const otherClient = (await otherClientResponse.json()) as { id: string }

    const createResponse = await createProject("spot-client-link", "Linked Spot", {
      client_id: client.id,
    })
    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as {
      id: string
      clientId: string
    }
    assert.equal(created.clientId, client.id)

    const invalidClientResponse = await createProject("spot-bad-client", "Bad", {
      clientId: "missing-client-id",
    })
    assert.equal(invalidClientResponse.status, 400)

    const detailResponse = await fetch(`${baseUrl}/api/projects/spot-client-link`)
    assert.equal(detailResponse.status, 200)
    const detail = (await detailResponse.json()) as {
      clientId: string
      client: { id: string; name: string; email: string } | null
    }
    assert.equal(detail.clientId, client.id)
    assert.equal(detail.client?.id, client.id)
    assert.equal(detail.client?.name, "Acme Corp")

    await createProject("spot-unlinked", "Unlinked Spot")

    const filteredResponse = await fetch(
      `${baseUrl}/api/projects?clientId=${client.id}`,
    )
    assert.equal(filteredResponse.status, 200)
    const filtered = (await filteredResponse.json()) as Array<{ id: string }>
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0]?.id, "spot-client-link")

    const clearResponse = await fetch(`${baseUrl}/api/projects/spot-client-link`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: null }),
    })
    assert.equal(clearResponse.status, 200)
    const cleared = (await clearResponse.json()) as { clientId?: string }
    assert.equal(cleared.clientId, undefined)

    const clearedDetailResponse = await fetch(
      `${baseUrl}/api/projects/spot-client-link`,
    )
    const clearedDetail = (await clearedDetailResponse.json()) as {
      client: null
    }
    assert.equal(clearedDetail.client, null)

    const relinkResponse = await fetch(`${baseUrl}/api/projects/spot-client-link`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: otherClient.id }),
    })
    assert.equal(relinkResponse.status, 200)
    const relinked = (await relinkResponse.json()) as { clientId: string }
    assert.equal(relinked.clientId, otherClient.id)

    const invalidPatchResponse = await fetch(
      `${baseUrl}/api/projects/spot-client-link`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "missing-client-id" }),
      },
    )
    assert.equal(invalidPatchResponse.status, 400)
  })

  it("creates, lists, updates, and deletes deliverables", async () => {
    await createProject("spot-deliv", "Spot Deliverables")

    const created = await createDeliverable("spot-deliv", "Hero Film")
    assert.equal(created.status, "not_started")

    const listResponse = await fetch(
      `${baseUrl}/api/projects/spot-deliv/deliverables`,
    )
    assert.equal(listResponse.status, 200)
    const list = (await listResponse.json()) as Array<{
      id: string
      versionCount: number
    }>
    assert.equal(list.length, 1)
    assert.equal(list[0]?.versionCount, 0)

    const statusResponse = await fetch(
      `${baseUrl}/api/deliverables/${created.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      },
    )
    assert.equal(statusResponse.status, 200)
    const withStatus = (await statusResponse.json()) as { status: string }
    assert.equal(withStatus.status, "approved")

    const badStatusResponse = await fetch(
      `${baseUrl}/api/deliverables/${created.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      },
    )
    assert.equal(badStatusResponse.status, 400)

    const deleteResponse = await fetch(
      `${baseUrl}/api/deliverables/${created.id}`,
      { method: "DELETE" },
    )
    assert.equal(deleteResponse.status, 204)

    const getResponse = await fetch(`${baseUrl}/api/deliverables/${created.id}`)
    assert.equal(getResponse.status, 404)
  })

  it("returns 404 when creating a deliverable for a missing project", async () => {
    const response = await fetch(
      `${baseUrl}/api/projects/does-not-exist/deliverables`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nope" }),
      },
    )
    assert.equal(response.status, 404)
  })

  it("creates, updates, and deletes milestones", async () => {
    await createProject("spot-milestone", "Spot Milestone")

    const createResponse = await fetch(
      `${baseUrl}/api/projects/spot-milestone/milestones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "First cut", dueDate: "2026-04-01" }),
      },
    )
    assert.equal(createResponse.status, 201)
    const milestone = (await createResponse.json()) as {
      id: string
      done: boolean
    }
    assert.equal(milestone.done, false)

    const patchResponse = await fetch(
      `${baseUrl}/api/milestones/${milestone.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      },
    )
    assert.equal(patchResponse.status, 200)
    const updated = (await patchResponse.json()) as { done: boolean }
    assert.equal(updated.done, true)

    const deleteResponse = await fetch(
      `${baseUrl}/api/milestones/${milestone.id}`,
      { method: "DELETE" },
    )
    assert.equal(deleteResponse.status, 204)
  })

  it("creates tasks and logs time entries", async () => {
    await createProject("spot-time", "Spot Time")

    const milestoneResponse = await fetch(
      `${baseUrl}/api/projects/spot-time/milestones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Animation pass" }),
      },
    )
    assert.equal(milestoneResponse.status, 201)
    const milestone = (await milestoneResponse.json()) as { id: string }

    const taskResponse = await fetch(
      `${baseUrl}/api/milestones/${milestone.id}/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Rig polish" }),
      },
    )
    assert.equal(taskResponse.status, 201)
    const task = (await taskResponse.json()) as { id: string; name: string }
    assert.equal(task.name, "Rig polish")

    const manualLogResponse = await fetch(
      `${baseUrl}/api/tasks/${task.id}/time-logs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationHours: 1.5,
          notes: "Blocked out motion",
        }),
      },
    )
    assert.equal(manualLogResponse.status, 201)
    const manualLog = (await manualLogResponse.json()) as {
      id: string
      durationHours: number
      notes?: string
    }
    assert.equal(manualLog.durationHours, 1.5)
    assert.equal(manualLog.notes, "Blocked out motion")

    const timerLogResponse = await fetch(
      `${baseUrl}/api/tasks/${task.id}/time-logs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationHours: 0.5 }),
      },
    )
    assert.equal(timerLogResponse.status, 201)

    const listResponse = await fetch(
      `${baseUrl}/api/tasks/${task.id}/time-logs`,
    )
    assert.equal(listResponse.status, 200)
    const entries = (await listResponse.json()) as Array<{ durationHours: number }>
    assert.equal(entries.length, 2)

    const projectTasksResponse = await fetch(
      `${baseUrl}/api/projects/spot-time/tasks`,
    )
    assert.equal(projectTasksResponse.status, 200)
    const projectTasks = (await projectTasksResponse.json()) as Array<{ id: string }>
    assert.equal(projectTasks.length, 1)

    const deleteLogResponse = await fetch(
      `${baseUrl}/api/time-logs/${manualLog.id}`,
      { method: "DELETE" },
    )
    assert.equal(deleteLogResponse.status, 204)

    const deleteTaskResponse = await fetch(`${baseUrl}/api/tasks/${task.id}`, {
      method: "DELETE",
    })
    assert.equal(deleteTaskResponse.status, 204)
  })

  it("rejects invalid time log duration", async () => {
    await createProject("spot-time-invalid", "Spot Time Invalid")

    const milestoneResponse = await fetch(
      `${baseUrl}/api/projects/spot-time-invalid/milestones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "QA" }),
      },
    )
    const milestone = (await milestoneResponse.json()) as { id: string }

    const taskResponse = await fetch(
      `${baseUrl}/api/milestones/${milestone.id}/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Review renders" }),
      },
    )
    const task = (await taskResponse.json()) as { id: string }

    const invalidResponse = await fetch(
      `${baseUrl}/api/tasks/${task.id}/time-logs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationHours: 0 }),
      },
    )
    assert.equal(invalidResponse.status, 400)
  })

  it("lists project summaries with rollup fields", async () => {
    await createProject("spot-summary", "Spot Summary")
    const deliverable = await createDeliverable("spot-summary", "Cut")
    await createVersion("spot-summary", deliverable.id, "v1")

    const listResponse = await fetch(`${baseUrl}/api/projects`)
    assert.equal(listResponse.status, 200)
    const projects = (await listResponse.json()) as Array<{
      id: string
      deliverableCount: number
      versionCount: number
      openCommentCount: number
      status: string
    }>
    const summary = projects.find((item) => item.id === "spot-summary")
    assert.ok(summary)
    assert.equal(summary.deliverableCount, 1)
    assert.equal(summary.versionCount, 1)
    assert.equal(summary.openCommentCount, 0)
    assert.equal(summary.status, "active")
  })

  it("deletes a project and cascades deliverables and comments", async () => {
    await createProject("spot-delete", "Spot Delete")
    const deliverable = await createDeliverable("spot-delete", "Cut")
    const version = await createVersion("spot-delete", deliverable.id, "v1")

    const createCommentResponse = await fetch(
      `${baseUrl}/api/deliverables/${deliverable.id}/versions/v1/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: 1, body: "Test comment", author: "Sam" }),
      },
    )
    assert.equal(createCommentResponse.status, 201)

    const deleteResponse = await fetch(`${baseUrl}/api/projects/spot-delete`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)

    const getResponse = await fetch(`${baseUrl}/api/projects/spot-delete`)
    assert.equal(getResponse.status, 404)

    const { listComments } = await import("../storage/repository.js")
    assert.equal(listComments(version.id).length, 0)
  })

  it("returns 404 when uploading to a non-existent deliverable", async () => {
    const response = await fetch(
      `${baseUrl}/api/deliverables/does-not-exist/versions/v1/upload`,
      { method: "POST" },
    )

    assert.equal(response.status, 404)
  })

  it("creates and updates comments for a deliverable version", async () => {
    await createProject("spot-b", "Spot B")
    const deliverable = await createDeliverable("spot-b", "Cut")
    await createVersion("spot-b", deliverable.id, "v1")

    const createCommentResponse = await fetch(
      `${baseUrl}/api/deliverables/${deliverable.id}/versions/v1/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: 8.2,
          body: "Soften the highlight",
          author: "Sam",
        }),
      },
    )

    assert.equal(createCommentResponse.status, 201)
    const comment = (await createCommentResponse.json()) as {
      id: string
      resolved: boolean
    }
    assert.equal(comment.resolved, false)

    const listResponse = await fetch(
      `${baseUrl}/api/deliverables/${deliverable.id}/versions/v1/comments`,
    )
    assert.equal(listResponse.status, 200)
    const comments = (await listResponse.json()) as Array<{ id: string }>
    assert.equal(comments.length, 1)

    const patchResponse = await fetch(
      `${baseUrl}/api/comments/${comment.id}/resolve`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      },
    )

    assert.equal(patchResponse.status, 200)
    const updated = (await patchResponse.json()) as { resolved: boolean }
    assert.equal(updated.resolved, true)

    const deleteResponse = await fetch(`${baseUrl}/api/comments/${comment.id}`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)
  })

  it("updates version approval status via PATCH /api/versions/:id/status", async () => {
    await createProject("spot-status", "Spot Status")
    const deliverable = await createDeliverable("spot-status", "Cut")
    const version = await createVersion("spot-status", deliverable.id, "v1")

    assert.equal(version.status, "pending_review")

    const approvedResponse = await fetch(
      `${baseUrl}/api/versions/${version.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      },
    )

    assert.equal(approvedResponse.status, 200)
    const approved = (await approvedResponse.json()) as { status: string }
    assert.equal(approved.status, "approved")

    const invalidResponse = await fetch(
      `${baseUrl}/api/versions/${version.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      },
    )

    assert.equal(invalidResponse.status, 400)

    const missingResponse = await fetch(
      `${baseUrl}/api/versions/missing-version-id/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      },
    )

    assert.equal(missingResponse.status, 404)
  })

  it("renames a version label via PATCH /api/versions/:id/label", async () => {
    await createProject("spot-rename", "Spot Rename")
    const deliverable = await createDeliverable("spot-rename", "Cut")
    const version = await createVersion("spot-rename", deliverable.id, "v1")
    await createVersion("spot-rename", deliverable.id, "v2")

    const renamedResponse = await fetch(
      `${baseUrl}/api/versions/${version.id}/label`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "v1-review" }),
      },
    )

    assert.equal(renamedResponse.status, 200)
    const renamed = (await renamedResponse.json()) as { label: string }
    assert.equal(renamed.label, "v1-review")

    const conflictResponse = await fetch(
      `${baseUrl}/api/versions/${version.id}/label`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "v2" }),
      },
    )

    assert.equal(conflictResponse.status, 409)
  })

  it("lists and creates comments via flat /api/comments endpoints", async () => {
    await createProject("spot-flat", "Spot Flat")
    const deliverable = await createDeliverable("spot-flat", "Cut")
    const version = await createVersion("spot-flat", deliverable.id, "v1")

    const createResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionId: version.id,
        timestamp: 3.5,
        body: "Flat route comment",
        author: "Alex",
      }),
    })

    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as { id: string; versionId: string }
    assert.equal(created.versionId, version.id)

    const listResponse = await fetch(
      `${baseUrl}/api/comments?versionId=${encodeURIComponent(version.id)}`,
    )
    assert.equal(listResponse.status, 200)
    const comments = (await listResponse.json()) as Array<{ id: string }>
    assert.equal(comments.length, 1)
    assert.equal(comments[0]?.id, created.id)
  })

  it("creates comments with frame annotations", async () => {
    await createProject("spot-annotate", "Spot Annotate")
    const deliverable = await createDeliverable("spot-annotate", "Cut")
    const version = await createVersion("spot-annotate", deliverable.id, "v1")

    const annotation = {
      timestamp: 4.25,
      viewportWidth: 1280,
      viewportHeight: 720,
      shapes: [
        {
          id: "shape-1",
          type: "arrow",
          color: "#f97316",
          strokeWidth: 0.004,
          points: [0.2, 0.3, 0.7, 0.6],
        },
      ],
    }

    const createResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionId: version.id,
        timestamp: 4.25,
        body: "Highlight this area",
        author: "Sam",
        annotation,
      }),
    })

    assert.equal(createResponse.status, 201)
    const createdComment = (await createResponse.json()) as {
      annotation?: { shapes: Array<{ type: string }> }
    }
    assert.equal(createdComment.annotation?.shapes.length, 1)
    assert.equal(createdComment.annotation?.shapes[0]?.type, "arrow")
  })

  it("rejects invalid frame annotations", async () => {
    await createProject("spot-annotate-invalid", "Spot Invalid")
    const deliverable = await createDeliverable("spot-annotate-invalid", "Cut")
    const version = await createVersion(
      "spot-annotate-invalid",
      deliverable.id,
      "v1",
    )

    const mismatchResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionId: version.id,
        timestamp: 2,
        body: "Mismatch",
        author: "Sam",
        annotation: {
          timestamp: 5,
          viewportWidth: 1280,
          viewportHeight: 720,
          shapes: [
            {
              id: "shape-1",
              type: "arrow",
              color: "#f97316",
              strokeWidth: 0.004,
              points: [0.1, 0.2, 0.3, 0.4],
            },
          ],
        },
      }),
    })

    assert.equal(mismatchResponse.status, 400)
  })

  it("creates, filters, updates, and deletes leads with contact log routes", async () => {
    const createResponse = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jordan Ellis",
        email: "jordan@example.com",
        status: "new",
      }),
    })
    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as {
      id: string
      replied: boolean
    }
    assert.equal(created.replied, false)

    await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sam Rivera",
        email: "sam@example.com",
        status: "contacted",
        replied: true,
      }),
    })

    const filteredResponse = await fetch(
      `${baseUrl}/api/leads?status=new&replied=false`,
    )
    assert.equal(filteredResponse.status, 200)
    const filtered = (await filteredResponse.json()) as Array<{ id: string }>
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0]?.id, created.id)

    const badFilterResponse = await fetch(`${baseUrl}/api/leads?replied=maybe`)
    assert.equal(badFilterResponse.status, 400)

    const logResponse = await fetch(`${baseUrl}/api/leads/${created.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "email",
        notes: "Sent portfolio.",
        contactedAt: "2026-06-10T10:00:00.000Z",
      }),
    })
    assert.equal(logResponse.status, 201)

    const repliedLogResponse = await fetch(
      `${baseUrl}/api/leads/${created.id}/log`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "call",
          notes: "Lead replied.",
          contactedAt: "2026-06-11T14:00:00.000Z",
          indicatesResponse: true,
        }),
      },
    )
    assert.equal(repliedLogResponse.status, 201)
    const logEntry = (await repliedLogResponse.json()) as { id: string }

    const getResponse = await fetch(`${baseUrl}/api/leads/${created.id}`)
    assert.equal(getResponse.status, 200)
    const lead = (await getResponse.json()) as {
      replied: boolean
      lastContactedAt: string
      contactLog: Array<{ id: string }>
    }
    assert.equal(lead.replied, true)
    assert.equal(lead.lastContactedAt, "2026-06-11T14:00:00.000Z")
    assert.equal(lead.contactLog.length, 2)

    const listLogResponse = await fetch(`${baseUrl}/api/leads/${created.id}/log`)
    assert.equal(listLogResponse.status, 200)
    const logEntries = (await listLogResponse.json()) as unknown[]
    assert.equal(logEntries.length, 2)

    const patchResponse = await fetch(`${baseUrl}/api/leads/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "negotiating", notes: "Budget discussion." }),
    })
    assert.equal(patchResponse.status, 200)
    const patched = (await patchResponse.json()) as { status: string }
    assert.equal(patched.status, "negotiating")

    const deleteLogResponse = await fetch(
      `${baseUrl}/api/leads/${created.id}/log/${logEntry.id}`,
      { method: "DELETE" },
    )
    assert.equal(deleteLogResponse.status, 204)

    const deleteResponse = await fetch(`${baseUrl}/api/leads/${created.id}`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)

    const missingResponse = await fetch(`${baseUrl}/api/leads/${created.id}`)
    assert.equal(missingResponse.status, 404)
  })

  it("creates, converts, updates, and deletes clients via API routes", async () => {
    const leadResponse = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Avery Chen",
        email: "avery@example.com",
        company: "Lumen Co",
        phone: "555-0100",
        status: "negotiating",
      }),
    })
    assert.equal(leadResponse.status, 201)
    const lead = (await leadResponse.json()) as { id: string }

    const convertResponse = await fetch(
      `${baseUrl}/api/leads/${lead.id}/convert`,
      { method: "POST" },
    )
    assert.equal(convertResponse.status, 201)
    const converted = (await convertResponse.json()) as {
      id: string
      convertedFromLeadId: string
      company: string
    }
    assert.equal(converted.convertedFromLeadId, lead.id)
    assert.equal(converted.company, "Lumen Co")

    const duplicateConvertResponse = await fetch(
      `${baseUrl}/api/leads/${lead.id}/convert`,
      { method: "POST" },
    )
    assert.equal(duplicateConvertResponse.status, 409)

    const leadGetResponse = await fetch(`${baseUrl}/api/leads/${lead.id}`)
    const updatedLead = (await leadGetResponse.json()) as { status: string }
    assert.equal(updatedLead.status, "converted")

    // Converted leads drop out of the default pipeline list...
    const defaultLeadsResponse = await fetch(`${baseUrl}/api/leads`)
    const defaultLeads = (await defaultLeadsResponse.json()) as Array<{
      id: string
    }>
    assert.ok(!defaultLeads.some((item) => item.id === lead.id))

    // ...but remain reachable via an explicit status filter.
    const convertedLeadsResponse = await fetch(
      `${baseUrl}/api/leads?status=converted`,
    )
    const convertedLeads = (await convertedLeadsResponse.json()) as Array<{
      id: string
    }>
    assert.ok(convertedLeads.some((item) => item.id === lead.id))

    const createResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Manual Client",
        email: "manual@example.com",
        website: "https://example.com",
      }),
    })
    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as { id: string }

    const listResponse = await fetch(`${baseUrl}/api/clients`)
    assert.equal(listResponse.status, 200)
    const clients = (await listResponse.json()) as Array<{ id: string }>
    const clientIds = clients.map((item) => item.id)
    assert.ok(clientIds.includes(converted.id))
    assert.ok(clientIds.includes(created.id))

    const { createProject: repoCreateProject } = await import(
      "../storage/repository.js"
    )
    repoCreateProject({
      id: "proj-client-api",
      name: "Linked Project",
      clientId: created.id,
      status: "on_hold",
    })

    const getResponse = await fetch(`${baseUrl}/api/clients/${created.id}`)
    assert.equal(getResponse.status, 200)
    const clientWithProjects = (await getResponse.json()) as {
      website: string
      projects: Array<{ id: string }>
    }
    assert.equal(clientWithProjects.website, "https://example.com")
    assert.equal(clientWithProjects.projects.length, 1)

    const patchResponse = await fetch(`${baseUrl}/api/clients/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Key account." }),
    })
    assert.equal(patchResponse.status, 200)
    const patched = (await patchResponse.json()) as { notes: string }
    assert.equal(patched.notes, "Key account.")

    const blockedDeleteResponse = await fetch(
      `${baseUrl}/api/clients/${created.id}`,
      { method: "DELETE" },
    )
    assert.equal(blockedDeleteResponse.status, 409)

    const archiveResponse = await fetch(
      `${baseUrl}/api/projects/proj-client-api/archive`,
      { method: "POST" },
    )
    assert.equal(archiveResponse.status, 200)
    const archivedProject = (await archiveResponse.json()) as {
      archivedAt?: string
    }
    assert.ok(archivedProject.archivedAt)

    const deleteResponse = await fetch(`${baseUrl}/api/clients/${created.id}`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)

    const missingResponse = await fetch(`${baseUrl}/api/clients/${created.id}`)
    assert.equal(missingResponse.status, 404)

    assert.equal(converted.id.length > 0, true)
  })

  it("manages retainer clients and cycle hour logging via API routes", async () => {
    const createResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Retainer Client",
        email: "retainer@example.com",
        company: "Retainer Studio",
        isRetainer: true,
        retainerHours: 30,
        retainerRate: 120,
        retainerCycleDay: 5,
      }),
    })
    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as {
      id: string
      isRetainer: boolean
      retainerHours: number
    }
    assert.equal(created.isRetainer, true)
    assert.equal(created.retainerHours, 30)

    const getResponse = await fetch(`${baseUrl}/api/clients/${created.id}`)
    assert.equal(getResponse.status, 200)
    const detail = (await getResponse.json()) as {
      retainerSummary?: {
        hoursContracted: number
        hoursLogged: number
        estimatedValue: number
      }
    }
    assert.ok(detail.retainerSummary)
    assert.equal(detail.retainerSummary.hoursContracted, 30)
    assert.equal(detail.retainerSummary.hoursLogged, 0)
    assert.equal(detail.retainerSummary.estimatedValue, 3600)

    const hoursResponse = await fetch(
      `${baseUrl}/api/clients/${created.id}/retainer-hours`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursLogged: 18.5 }),
      },
    )
    assert.equal(hoursResponse.status, 200)
    const updated = (await hoursResponse.json()) as {
      retainerSummary?: { hoursLogged: number; utilizationPercent: number }
    }
    assert.equal(updated.retainerSummary?.hoursLogged, 18.5)
    assert.equal(updated.retainerSummary?.utilizationPercent, 62)

    const invalidRetainerResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad Retainer",
        email: "bad@example.com",
        isRetainer: true,
        retainerHours: 10,
      }),
    })
    assert.equal(invalidRetainerResponse.status, 400)
  })

  it("reverts clients back to leads via API routes", async () => {
    // A converted lead reverts onto its original lead record.
    const leadResponse = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Revert Source",
        email: "revert@example.com",
        company: "Revert Co",
        status: "negotiating",
      }),
    })
    const lead = (await leadResponse.json()) as { id: string }

    const convertResponse = await fetch(
      `${baseUrl}/api/leads/${lead.id}/convert`,
      { method: "POST" },
    )
    assert.equal(convertResponse.status, 201)
    const client = (await convertResponse.json()) as { id: string }

    const revertResponse = await fetch(
      `${baseUrl}/api/clients/${client.id}/revert-to-lead`,
      { method: "POST" },
    )
    assert.equal(revertResponse.status, 201)
    const revertedLead = (await revertResponse.json()) as {
      id: string
      status: string
    }
    assert.equal(revertedLead.id, lead.id)
    assert.equal(revertedLead.status, "negotiating")

    // The client record is gone and the lead is back in the pipeline list.
    const clientGone = await fetch(`${baseUrl}/api/clients/${client.id}`)
    assert.equal(clientGone.status, 404)

    const leadsList = (await (await fetch(`${baseUrl}/api/leads`)).json()) as Array<{
      id: string
    }>
    assert.ok(leadsList.some((item) => item.id === lead.id))

    // A manually created client reverts into a brand new lead.
    const manualResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Manual Revert",
        email: "manual-revert@example.com",
      }),
    })
    const manualClient = (await manualResponse.json()) as { id: string }

    const manualRevertResponse = await fetch(
      `${baseUrl}/api/clients/${manualClient.id}/revert-to-lead`,
      { method: "POST" },
    )
    assert.equal(manualRevertResponse.status, 201)
    const manualLead = (await manualRevertResponse.json()) as {
      id: string
      name: string
      status: string
    }
    assert.notEqual(manualLead.id, manualClient.id)
    assert.equal(manualLead.name, "Manual Revert")
    assert.equal(manualLead.status, "negotiating")

    // Reverting is blocked while the client has active (non-archived) projects.
    const blockedLeadResponse = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Blocked", email: "blocked@example.com" }),
    })
    const blockedLead = (await blockedLeadResponse.json()) as { id: string }
    const blockedClient = (await (
      await fetch(`${baseUrl}/api/leads/${blockedLead.id}/convert`, {
        method: "POST",
      })
    ).json()) as { id: string }

    const { createProject: repoCreateProject } = await import(
      "../storage/repository.js"
    )
    repoCreateProject({
      id: "proj-revert-block",
      name: "Active Linked Project",
      clientId: blockedClient.id,
      status: "active",
    })

    const blockedRevertResponse = await fetch(
      `${baseUrl}/api/clients/${blockedClient.id}/revert-to-lead`,
      { method: "POST" },
    )
    assert.equal(blockedRevertResponse.status, 409)

    const missingRevertResponse = await fetch(
      `${baseUrl}/api/clients/does-not-exist/revert-to-lead`,
      { method: "POST" },
    )
    assert.equal(missingRevertResponse.status, 404)
  })

  it("creates, updates, lists, and deletes services via API routes", async () => {
    const createResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Explainer Video",
        hourEstimate: 20,
        hourlyRate: 200,
        type: "animated",
      }),
    })
    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as {
      id: string
      name: string
      type: string
    }
    assert.equal(created.name, "Explainer Video")
    assert.equal(created.type, "animated")

    const invalidTypeResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Invalid",
        hourEstimate: 1,
        hourlyRate: 100,
        type: "video",
      }),
    })
    assert.equal(invalidTypeResponse.status, 400)

    const zeroHourEstimateResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Zero Hours",
        hourEstimate: 0,
        hourlyRate: 100,
        type: "static",
      }),
    })
    assert.equal(zeroHourEstimateResponse.status, 400)

    const invalidHourEstimatePrecisionResponse = await fetch(
      `${baseUrl}/api/services`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Too Precise",
          hourEstimate: 1.25,
          hourlyRate: 100,
          type: "static",
        }),
      },
    )
    assert.equal(invalidHourEstimatePrecisionResponse.status, 400)

    const longNameResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "x".repeat(101),
        hourEstimate: 1,
        hourlyRate: 100,
        type: "static",
      }),
    })
    assert.equal(longNameResponse.status, 400)

    const listResponse = await fetch(`${baseUrl}/api/services`)
    assert.equal(listResponse.status, 200)
    const services = (await listResponse.json()) as Array<{ id: string }>
    assert.ok(services.some((service) => service.id === created.id))

    const updateResponse = await fetch(`${baseUrl}/api/services/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Explainer Video (Revised)",
        hourEstimate: 24,
        hourlyRate: 210,
        type: "animated",
      }),
    })
    assert.equal(updateResponse.status, 200)
    const updated = (await updateResponse.json()) as {
      name: string
      hourEstimate: number
    }
    assert.equal(updated.name, "Explainer Video (Revised)")
    assert.equal(updated.hourEstimate, 24)

    const missingUpdateResponse = await fetch(
      `${baseUrl}/api/services/missing-service-id`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ghost",
          hourEstimate: 1,
          hourlyRate: 1,
          type: "static",
        }),
      },
    )
    assert.equal(missingUpdateResponse.status, 404)

    const deleteResponse = await fetch(`${baseUrl}/api/services/${created.id}`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)

    const missingDeleteResponse = await fetch(
      `${baseUrl}/api/services/${created.id}`,
      { method: "DELETE" },
    )
    assert.equal(missingDeleteResponse.status, 404)
  })

  it("returns linked project usage for a service", async () => {
    const createResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Social Cutdown",
        hourEstimate: 6,
        hourlyRate: 175,
        type: "animated",
      }),
    })
    assert.equal(createResponse.status, 201)
    const service = (await createResponse.json()) as { id: string }

    const usageBeforeLinkResponse = await fetch(
      `${baseUrl}/api/services/${service.id}/usage`,
    )
    assert.equal(usageBeforeLinkResponse.status, 200)
    const usageBeforeLink = (await usageBeforeLinkResponse.json()) as {
      projectCount: number
    }
    assert.equal(usageBeforeLink.projectCount, 0)

    const projectResponse = await createProject("svc-project", "Launch Film")
    assert.equal(projectResponse.status, 201)

    const { linkServiceToProject } = await import("../storage/repository.js")
    linkServiceToProject("svc-project", service.id)

    const usageResponse = await fetch(
      `${baseUrl}/api/services/${service.id}/usage`,
    )
    assert.equal(usageResponse.status, 200)
    const usage = (await usageResponse.json()) as {
      projectCount: number
      projects: Array<{ name: string }>
    }
    assert.equal(usage.projectCount, 1)
    assert.equal(usage.projects[0]?.name, "Launch Film")

    const missingUsageResponse = await fetch(
      `${baseUrl}/api/services/missing-service/usage`,
    )
    assert.equal(missingUsageResponse.status, 404)
  })

  it("lists, attaches, and removes project services via API routes", async () => {
    const projectResponse = await createProject("svc-proj-api", "Service Project")
    assert.equal(projectResponse.status, 201)

    const serviceResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Logo Design",
        hourEstimate: 8,
        hourlyRate: 150,
        type: "static",
      }),
    })
    assert.equal(serviceResponse.status, 201)
    const service = (await serviceResponse.json()) as { id: string; name: string }

    const emptyListResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services`,
    )
    assert.equal(emptyListResponse.status, 200)
    assert.deepEqual(await emptyListResponse.json(), [])

    const attachResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, quantity: 2 }),
      },
    )
    assert.equal(attachResponse.status, 201)
    const attached = (await attachResponse.json()) as {
      id: string
      projectId: string
      serviceId: string
      quantity: number
      service: { name: string }
    }
    assert.equal(attached.projectId, "svc-proj-api")
    assert.equal(attached.serviceId, service.id)
    assert.equal(attached.quantity, 2)
    assert.equal(attached.service.name, "Logo Design")

    const duplicateResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id }),
      },
    )
    assert.equal(duplicateResponse.status, 409)

    const listResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services`,
    )
    assert.equal(listResponse.status, 200)
    const listed = (await listResponse.json()) as Array<{ serviceId: string }>
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.serviceId, service.id)

    const patchResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services/${service.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideHours: 10 }),
      },
    )
    assert.equal(patchResponse.status, 200)
    const patched = (await patchResponse.json()) as {
      overrideHours: number | null
      service: { hourEstimate: number }
    }
    assert.equal(patched.overrideHours, 10)
    assert.equal(patched.service.hourEstimate, 8)

    const catalogResponse = await fetch(`${baseUrl}/api/services`)
    assert.equal(catalogResponse.status, 200)
    const catalog = (await catalogResponse.json()) as Array<{
      id: string
      hourEstimate: number
    }>
    assert.equal(
      catalog.find((entry) => entry.id === service.id)?.hourEstimate,
      8,
    )

    const resetResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services/${service.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideHours: null }),
      },
    )
    assert.equal(resetResponse.status, 200)
    const reset = (await resetResponse.json()) as { overrideHours: number | null }
    assert.equal(reset.overrideHours, null)

    const invalidPatchResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services/${service.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideHours: -1 }),
      },
    )
    assert.equal(invalidPatchResponse.status, 400)

    const deleteResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services/${service.id}`,
      { method: "DELETE" },
    )
    assert.equal(deleteResponse.status, 204)

    const serviceStillExistsResponse = await fetch(`${baseUrl}/api/services`)
    assert.equal(serviceStillExistsResponse.status, 200)
    const services = (await serviceStillExistsResponse.json()) as Array<{
      id: string
    }>
    assert.ok(services.some((entry) => entry.id === service.id))

    const missingDeleteResponse = await fetch(
      `${baseUrl}/api/projects/svc-proj-api/services/${service.id}`,
      { method: "DELETE" },
    )
    assert.equal(missingDeleteResponse.status, 404)

    const missingProjectResponse = await fetch(
      `${baseUrl}/api/projects/missing-project/services`,
    )
    assert.equal(missingProjectResponse.status, 404)
  })

  it("duplicates a project via POST /api/projects/:projectId/duplicate", async () => {
    await createProject("dup-source", "Original Project", {
      status: "on_hold",
      startDate: "2026-03-01",
      endDate: "2026-08-01",
      budget: { total: 25_000, currency: "USD" },
      description: "Project brief",
    })
    await createDeliverable("dup-source", "Main Film")

    const serviceResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Edit Package",
        hourEstimate: 6,
        hourlyRate: 180,
        type: "static",
      }),
    })
    assert.equal(serviceResponse.status, 201)
    const service = (await serviceResponse.json()) as { id: string }

    const attachResponse = await fetch(
      `${baseUrl}/api/projects/dup-source/services`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, quantity: 1 }),
      },
    )
    assert.equal(attachResponse.status, 201)

    const milestoneResponse = await fetch(
      `${baseUrl}/api/projects/dup-source/milestones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Client review",
          dueDate: "2026-04-15",
          done: true,
        }),
      },
    )
    assert.equal(milestoneResponse.status, 201)

    const duplicateResponse = await fetch(
      `${baseUrl}/api/projects/dup-source/duplicate`,
      { method: "POST" },
    )
    assert.equal(duplicateResponse.status, 201)
    const duplicate = (await duplicateResponse.json()) as {
      id: string
      name: string
      status: string
      description?: string
      startDate?: string
      endDate?: string
      budget?: unknown
      clientId?: string
    }

    assert.notEqual(duplicate.id, "dup-source")
    assert.equal(duplicate.name, "Original Project (Copy)")
    assert.equal(duplicate.status, "active")
    assert.equal(duplicate.description, "Project brief")
    assert.equal(duplicate.startDate, undefined)
    assert.equal(duplicate.endDate, undefined)
    assert.equal(duplicate.budget, undefined)
    assert.equal(duplicate.clientId, undefined)

    const deliverablesResponse = await fetch(
      `${baseUrl}/api/projects/${duplicate.id}/deliverables`,
    )
    assert.equal(deliverablesResponse.status, 200)
    assert.deepEqual(await deliverablesResponse.json(), [])

    const servicesResponse = await fetch(
      `${baseUrl}/api/projects/${duplicate.id}/services`,
    )
    assert.equal(servicesResponse.status, 200)
    const services = (await servicesResponse.json()) as Array<{ serviceId: string }>
    assert.equal(services.length, 1)
    assert.equal(services[0]?.serviceId, service.id)

    const milestonesResponse = await fetch(
      `${baseUrl}/api/projects/${duplicate.id}/milestones`,
    )
    assert.equal(milestonesResponse.status, 200)
    const milestones = (await milestonesResponse.json()) as Array<{
      name: string
      done: boolean
      dueDate?: string
    }>
    assert.equal(milestones.length, 1)
    assert.equal(milestones[0]?.name, "Client review")
    assert.equal(milestones[0]?.done, false)
    assert.equal(milestones[0]?.dueDate, undefined)

    const missingResponse = await fetch(
      `${baseUrl}/api/projects/missing-project/duplicate`,
      { method: "POST" },
    )
    assert.equal(missingResponse.status, 404)
  })
})
