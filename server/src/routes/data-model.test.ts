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

    const patchResponse = await fetch(`${baseUrl}/api/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    })

    assert.equal(patchResponse.status, 200)
    const updated = (await patchResponse.json()) as { resolved: boolean }
    assert.equal(updated.resolved, true)

    const deleteResponse = await fetch(`${baseUrl}/api/comments/${comment.id}`, {
      method: "DELETE",
    })
    assert.equal(deleteResponse.status, 204)
  })
})
