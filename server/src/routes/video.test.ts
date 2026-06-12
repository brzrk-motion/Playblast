import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { getUploadDir } from "../config/paths.js"

const projectId = "test-project"
const deliverableId = "test-deliverable"
const version = "v1"
const filename = "sample.mp4"

let server: Server
let baseUrl: string
let testUploadRoot = ""

before(async () => {
  testUploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-uploads-"))
  process.env.UPLOAD_DIR = testUploadRoot

  const uploadDir = getUploadDir(projectId, deliverableId, version)
  fs.mkdirSync(uploadDir, { recursive: true })
  fs.writeFileSync(path.join(uploadDir, filename), Buffer.alloc(1024, 0xab))

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

  fs.rmSync(getUploadDir(projectId, deliverableId, version), { recursive: true, force: true })
  delete process.env.UPLOAD_DIR
  fs.rmSync(testUploadRoot, { recursive: true, force: true })
})

describe("GET /video/:projectId/:deliverableId/:version/:filename", () => {
  it("returns the full file with Accept-Ranges and Content-Length", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/${filename}`,
    )

    assert.equal(response.status, 200)
    assert.equal(response.headers.get("accept-ranges"), "bytes")
    assert.equal(response.headers.get("content-length"), "1024")
    assert.equal(response.headers.get("content-type"), "video/mp4")

    const body = Buffer.from(await response.arrayBuffer())
    assert.equal(body.length, 1024)
    assert.equal(body[0], 0xab)
  })

  it("returns 206 with Content-Range for byte range requests", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/${filename}`,
      { headers: { Range: "bytes=100-199" } },
    )

    assert.equal(response.status, 206)
    assert.equal(response.headers.get("accept-ranges"), "bytes")
    assert.equal(response.headers.get("content-range"), "bytes 100-199/1024")
    assert.equal(response.headers.get("content-length"), "100")

    const body = Buffer.from(await response.arrayBuffer())
    assert.equal(body.length, 100)
    assert.equal(body[0], 0xab)
  })

  it("returns 206 for open-ended range requests", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/${filename}`,
      { headers: { Range: "bytes=900-" } },
    )

    assert.equal(response.status, 206)
    assert.equal(response.headers.get("content-range"), "bytes 900-1023/1024")
    assert.equal(response.headers.get("content-length"), "124")
  })

  it("returns 416 for unsatisfiable range requests", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/${filename}`,
      { headers: { Range: "bytes=2000-3000" } },
    )

    assert.equal(response.status, 416)
    assert.equal(response.headers.get("content-range"), "bytes */1024")
  })

  it("returns 404 when the video does not exist", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/missing.mp4`,
    )

    assert.equal(response.status, 404)
  })

  it("returns 400 for invalid path segments", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/bad%20name.mp4`,
    )

    assert.equal(response.status, 400)
  })
})

describe("GET /video large file", () => {
  const largeFilename = "large-sample.mp4"
  const largeFileSize = 512 * 1024 * 1024 // 512 MB

  before(() => {
    const uploadDir = getUploadDir(projectId, deliverableId, version)
    const largePath = path.join(uploadDir, largeFilename)

    const fd = fs.openSync(largePath, "w")
    fs.ftruncateSync(fd, largeFileSize)
    fs.writeSync(fd, Buffer.from([0xde, 0xad, 0xbe, 0xef]), 0, 4, 0)
    fs.writeSync(
      fd,
      Buffer.from([0xca, 0xfe, 0xba, 0xbe]),
      0,
      4,
      largeFileSize - 4,
    )
    fs.closeSync(fd)
  })

  after(() => {
    fs.rmSync(path.join(getUploadDir(projectId, deliverableId, version), largeFilename), {
      force: true,
    })
  })

  it("seeks into a 512MB file without reading the entire file", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/${largeFilename}`,
      { headers: { Range: "bytes=0-3" } },
    )

    assert.equal(response.status, 206)
    assert.equal(
      response.headers.get("content-range"),
      `bytes 0-3/${largeFileSize}`,
    )

    const body = Buffer.from(await response.arrayBuffer())
    assert.deepEqual(body, Buffer.from([0xde, 0xad, 0xbe, 0xef]))
  })

  it("reads the tail of a 512MB file via range request", async () => {
    const response = await fetch(
      `${baseUrl}/video/${projectId}/${deliverableId}/${version}/${largeFilename}`,
      { headers: { Range: `bytes=${largeFileSize - 4}-${largeFileSize - 1}` } },
    )

    assert.equal(response.status, 206)
    assert.equal(response.headers.get("content-length"), "4")

    const body = Buffer.from(await response.arrayBuffer())
    assert.deepEqual(body, Buffer.from([0xca, 0xfe, 0xba, 0xbe]))
  })
})
