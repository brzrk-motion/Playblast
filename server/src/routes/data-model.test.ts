import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"

let tempDir = ""
let server: Server
let baseUrl = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-api-"))
  process.env.PLAYBLAST_DATA_DIR = tempDir

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

  delete process.env.PLAYBLAST_DATA_DIR
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("projects, versions, and comments API", () => {
  it("creates a project and lists versions", async () => {
    const createResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-a", name: "Spot A" }),
    })

    assert.equal(createResponse.status, 201)
    const project = (await createResponse.json()) as { id: string; name: string }
    assert.equal(project.id, "spot-a")
    assert.equal(project.name, "Spot A")

    const listResponse = await fetch(`${baseUrl}/api/projects`)
    assert.equal(listResponse.status, 200)
    const projects = (await listResponse.json()) as Array<{ id: string }>
    assert.equal(projects.some((item) => item.id === "spot-a"), true)

    const versionsResponse = await fetch(`${baseUrl}/api/projects/spot-a/versions`)
    assert.equal(versionsResponse.status, 200)
    const versions = (await versionsResponse.json()) as unknown[]
    assert.equal(versions.length, 0)
  })

  it("gets a project by id and returns 404 when missing", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-get", name: "Spot Get" }),
    })

    const getResponse = await fetch(`${baseUrl}/api/projects/spot-get`)
    assert.equal(getResponse.status, 200)
    const project = (await getResponse.json()) as { id: string; name: string }
    assert.equal(project.id, "spot-get")
    assert.equal(project.name, "Spot Get")

    const missingResponse = await fetch(`${baseUrl}/api/projects/missing-id`)
    assert.equal(missingResponse.status, 404)
  })

  it("lists projects with version count and updated date", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-summary", name: "Spot Summary" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    createVersion({
      projectId: "spot-summary",
      label: "v1",
      filename: "render.mp4",
    })

    const listResponse = await fetch(`${baseUrl}/api/projects`)
    assert.equal(listResponse.status, 200)
    const projects = (await listResponse.json()) as Array<{
      id: string
      versionCount: number
      updatedAt: string
      status: string
    }>
    const summary = projects.find((item) => item.id === "spot-summary")
    assert.ok(summary)
    assert.equal(summary.versionCount, 1)
    assert.ok(summary.updatedAt)
    assert.equal(summary.openCommentCount, 0)
    assert.equal(summary.status, "pending_review")
  })

  it("lists projects with open comment count across versions", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-open-count", name: "Spot Open Count" }),
    })

    const { createVersion, createComment } = await import("../storage/repository.js")
    const version = createVersion({
      projectId: "spot-open-count",
      label: "v1",
      filename: "render.mp4",
    })

    const openComment = createComment({
      versionId: version.id,
      timestamp: 1,
      body: "Needs fix",
      author: "Sam",
    })
    const resolvedComment = createComment({
      versionId: version.id,
      timestamp: 2,
      body: "Already fixed",
      author: "Alex",
    })
    const { updateComment } = await import("../storage/repository.js")
    updateComment(resolvedComment.id, { resolved: true })

    const listResponse = await fetch(`${baseUrl}/api/projects`)
    assert.equal(listResponse.status, 200)
    const projects = (await listResponse.json()) as Array<{
      id: string
      openCommentCount: number
    }>
    const summary = projects.find((item) => item.id === "spot-open-count")
    assert.ok(summary)
    assert.equal(summary.openCommentCount, 1)
    assert.equal(openComment.resolved, false)
  })

  it("deletes a project and cascades versions and comments", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-delete", name: "Spot Delete" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    const version = createVersion({
      projectId: "spot-delete",
      label: "v1",
      filename: "render.mp4",
    })

    const createCommentResponse = await fetch(
      `${baseUrl}/api/projects/spot-delete/versions/v1/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: 1,
          body: "Test comment",
          author: "Sam",
        }),
      },
    )
    assert.equal(createCommentResponse.status, 201)

    const deleteResponse = await fetch(`${baseUrl}/api/projects/spot-delete`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)

    const getResponse = await fetch(`${baseUrl}/api/projects/spot-delete`)
    assert.equal(getResponse.status, 404)

    const versionsResponse = await fetch(
      `${baseUrl}/api/projects/spot-delete/versions`,
    )
    assert.equal(versionsResponse.status, 404)

    const { listComments } = await import("../storage/repository.js")
    assert.equal(listComments(version.id).length, 0)
  })

  it("returns 404 when uploading to a non-existent project", async () => {
    const response = await fetch(
      `${baseUrl}/api/projects/does-not-exist/versions/v1/upload`,
      { method: "POST" },
    )

    assert.equal(response.status, 404)
  })

  it("creates and updates comments for a version", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-b", name: "Spot B" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    createVersion({
      projectId: "spot-b",
      label: "v1",
      filename: "render.mp4",
    })

    const createCommentResponse = await fetch(
      `${baseUrl}/api/projects/spot-b/versions/v1/comments`,
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
      `${baseUrl}/api/projects/spot-b/versions/v1/comments`,
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

    const unresolveResponse = await fetch(
      `${baseUrl}/api/comments/${comment.id}/resolve`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: false }),
      },
    )

    assert.equal(unresolveResponse.status, 200)
    const unresolved = (await unresolveResponse.json()) as { resolved: boolean }
    assert.equal(unresolved.resolved, false)

    const legacyPatchResponse = await fetch(`${baseUrl}/api/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    })

    assert.equal(legacyPatchResponse.status, 200)
    const legacyUpdated = (await legacyPatchResponse.json()) as { resolved: boolean }
    assert.equal(legacyUpdated.resolved, true)

    const deleteResponse = await fetch(`${baseUrl}/api/comments/${comment.id}`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)
  })

  it("updates version approval status via PATCH /api/versions/:id/status", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-status", name: "Spot Status" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    const version = createVersion({
      projectId: "spot-status",
      label: "v1",
      filename: "render.mp4",
    })

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

    const revisionResponse = await fetch(
      `${baseUrl}/api/versions/${version.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "needs_revision" }),
      },
    )

    assert.equal(revisionResponse.status, 200)
    const revision = (await revisionResponse.json()) as { status: string }
    assert.equal(revision.status, "needs_revision")

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
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-rename", name: "Spot Rename" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    const version = createVersion({
      projectId: "spot-rename",
      label: "v1",
      filename: "render.mp4",
    })
    createVersion({
      projectId: "spot-rename",
      label: "v2",
      filename: "other.mp4",
    })

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
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-flat", name: "Spot Flat" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    const version = createVersion({
      projectId: "spot-flat",
      label: "v1",
      filename: "render.mp4",
    })

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
    const created = (await createResponse.json()) as {
      id: string
      versionId: string
    }
    assert.equal(created.versionId, version.id)

    const listResponse = await fetch(
      `${baseUrl}/api/comments?versionId=${encodeURIComponent(version.id)}`,
    )
    assert.equal(listResponse.status, 200)
    const comments = (await listResponse.json()) as Array<{
      id: string
      timestamp: number
    }>
    assert.equal(comments.length, 1)
    assert.equal(comments[0]?.id, created.id)
    assert.equal(comments[0]?.timestamp, 3.5)
  })

  it("creates comments with frame annotations", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-annotate", name: "Spot Annotate" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    const version = createVersion({
      projectId: "spot-annotate",
      label: "v1",
      filename: "render.mp4",
    })

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
        {
          id: "shape-2",
          type: "text",
          color: "#f97316",
          strokeWidth: 0.004,
          points: [0.5, 0.5],
          text: "Fix lighting",
          fontSize: 0.04,
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
    const created = (await createResponse.json()) as {
      annotation?: { shapes: Array<{ type: string }> }
    }
    assert.equal(created.annotation?.shapes.length, 2)
    assert.equal(created.annotation?.shapes[0]?.type, "arrow")

    const listResponse = await fetch(
      `${baseUrl}/api/comments?versionId=${encodeURIComponent(version.id)}`,
    )
    assert.equal(listResponse.status, 200)
    const comments = (await listResponse.json()) as Array<{
      annotation?: { shapes: unknown[] }
    }>
    assert.equal(comments.length, 1)
    assert.equal(comments[0]?.annotation?.shapes.length, 2)
  })

  it("rejects invalid frame annotations", async () => {
    await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "spot-annotate-invalid", name: "Spot Invalid" }),
    })

    const { createVersion } = await import("../storage/repository.js")
    const version = createVersion({
      projectId: "spot-annotate-invalid",
      label: "v1",
      filename: "render.mp4",
    })

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

    const emptyShapesResponse = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionId: version.id,
        timestamp: 2,
        body: "Empty shapes",
        author: "Sam",
        annotation: {
          timestamp: 2,
          viewportWidth: 1280,
          viewportHeight: 720,
          shapes: [],
        },
      }),
    })

    assert.equal(emptyShapesResponse.status, 400)
  })
})
