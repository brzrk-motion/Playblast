import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Express } from "express"
import { config } from "../config/env.js"
import {
  removeStaleVersionFile,
  removeUploadedFile,
  uploadedFilePath,
} from "./upload-cleanup.js"

const previousUploadDir = process.env.UPLOAD_DIR

afterEach(() => {
  if (previousUploadDir === undefined) {
    delete process.env.UPLOAD_DIR
  } else {
    process.env.UPLOAD_DIR = previousUploadDir
  }
})

describe("upload cleanup helpers", () => {
  it("removes an uploaded file when cleanup runs", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-upload-cleanup-"))
    const filePath = path.join(tempDir, "clip.mp4")
    fs.writeFileSync(filePath, Buffer.alloc(8, 0xab))

    const file = {
      path: filePath,
      destination: tempDir,
      filename: "clip.mp4",
    } as Express.Multer.File

    assert.equal(uploadedFilePath(file), filePath)
    removeUploadedFile(file)
    assert.equal(fs.existsSync(filePath), false)
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("removes a stale version file inside the upload boundary", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-stale-version-"))
    process.env.UPLOAD_DIR = tempDir

    const projectId = "project-a"
    const deliverableId = "deliverable-a"
    const versionLabel = "v1"
    const oldFilename = "old-cut.mp4"
    const versionDir = path.join(tempDir, projectId, deliverableId, versionLabel)
    fs.mkdirSync(versionDir, { recursive: true })
    const oldPath = path.join(versionDir, oldFilename)
    fs.writeFileSync(oldPath, Buffer.alloc(4, 0xcd))

    removeStaleVersionFile(projectId, deliverableId, versionLabel, oldFilename)
    assert.equal(fs.existsSync(oldPath), false)
    assert.equal(config.uploadDir, tempDir)
    fs.rmSync(tempDir, { recursive: true, force: true })
  })
})
