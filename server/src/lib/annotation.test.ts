import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { parseFrameAnnotation } from "./annotation.js"

describe("parseFrameAnnotation", () => {
  it("parses a valid annotation payload", () => {
    const result = parseFrameAnnotation({
      timestamp: 1.5,
      viewportWidth: 1920,
      viewportHeight: 1080,
      shapes: [
        {
          id: "shape-1",
          type: "freehand",
          color: "#f97316",
          strokeWidth: 0.004,
          points: [0.1, 0.2, 0.3, 0.4],
        },
      ],
    })

    assert.ok(!("error" in result))
    assert.equal(result.timestamp, 1.5)
    assert.equal(result.shapes.length, 1)
    assert.equal(result.shapes[0]?.type, "freehand")
  })

  it("rejects annotations with invalid coordinates", () => {
    const result = parseFrameAnnotation({
      timestamp: 1,
      viewportWidth: 1280,
      viewportHeight: 720,
      shapes: [
        {
          id: "shape-1",
          type: "arrow",
          color: "#f97316",
          strokeWidth: 0.004,
          points: [0.1, 0.2, 1.5, 0.4],
        },
      ],
    })

    assert.ok("error" in result)
  })
})
