import assert from "node:assert/strict"
import { test } from "node:test"

import {
  getPlaybackWarnings,
  inferCodecHint,
} from "../../../client/src/lib/video-format.ts"

function makeFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type })
}

test("inferCodecHint detects ProRes from filename", () => {
  assert.equal(inferCodecHint("spot_prores_422.mov", "video/quicktime"), "ProRes")
})

test("inferCodecHint detects H.264 from filename", () => {
  assert.equal(inferCodecHint("render_h264.mp4", "video/mp4"), "H.264")
})

test("getPlaybackWarnings flags ProRes mov files", () => {
  const warnings = getPlaybackWarnings(
    makeFile("hero_prores.mov", "video/quicktime", 120 * 1024 * 1024),
  )

  assert.ok(warnings.some((warning) => warning.message.includes("ProRes")))
})

test("getPlaybackWarnings flags MKV files", () => {
  const warnings = getPlaybackWarnings(makeFile("render.mkv", "video/x-matroska"))

  assert.ok(warnings.some((warning) => warning.message.includes("MKV")))
})

test("getPlaybackWarnings flags HEVC files", () => {
  const warnings = getPlaybackWarnings(makeFile("spot_hevc.mp4", "video/mp4"))

  assert.ok(warnings.some((warning) => warning.message.includes("HEVC")))
})
