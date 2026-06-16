import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildVersionDownloadFilename } from "./download-filename.js"

describe("buildVersionDownloadFilename", () => {
  it("builds project-name-version-label.ext", () => {
    assert.equal(
      buildVersionDownloadFilename("Brand Video", "v3", "render.MP4"),
      "brand-video-v3.mp4",
    )
  })

  it("sanitizes special characters in the project name", () => {
    assert.equal(
      buildVersionDownloadFilename("Spot A (Final)!", "v1", "clip.mov"),
      "spot-a-final-v1.mov",
    )
  })

  it("falls back when the project name has no safe characters", () => {
    assert.equal(
      buildVersionDownloadFilename("!!!", "v2", "file.webm"),
      "project-v2.webm",
    )
  })
})
