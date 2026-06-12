import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { ensureUploadDir, getProjectUploadDir, getUploadRoot } from "./paths.js"

describe("upload directory configuration", () => {
  let tempDir: string
  let originalUploadDir: string | undefined

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-uploads-"))
    originalUploadDir = process.env.UPLOAD_DIR
    process.env.UPLOAD_DIR = tempDir
  })

  afterEach(() => {
    if (originalUploadDir === undefined) {
      delete process.env.UPLOAD_DIR
    } else {
      process.env.UPLOAD_DIR = originalUploadDir
    }

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("creates UPLOAD_DIR on startup when it does not exist", () => {
    const nestedDir = path.join(tempDir, "nested", "uploads")
    process.env.UPLOAD_DIR = nestedDir

    assert.equal(fs.existsSync(nestedDir), false)

    const resolved = ensureUploadDir()

    assert.equal(resolved, getUploadRoot())
    assert.equal(getUploadRoot(), path.resolve(nestedDir))
    assert.equal(fs.existsSync(nestedDir), true)
    assert.ok(fs.statSync(nestedDir).isDirectory())
  })

  it("uses UPLOAD_DIR as the base for project upload paths", () => {
    ensureUploadDir()

    assert.equal(
      getProjectUploadDir("my-project"),
      path.join(path.resolve(tempDir), "my-project"),
    )
  })
})
