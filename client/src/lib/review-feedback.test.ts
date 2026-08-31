import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  resolveAsyncViewState,
  reviewEmptyCopy,
  reviewErrorTitle,
  reviewMissingMessage,
} from "./review-feedback"

describe("reviewErrorTitle", () => {
  it("returns surface-specific titles", () => {
    assert.equal(reviewErrorTitle("dashboard"), "Dashboard unavailable")
    assert.equal(reviewErrorTitle("project"), "Project unavailable")
    assert.equal(reviewErrorTitle("deliverable"), "Deliverable unavailable")
    assert.equal(reviewErrorTitle("compare"), "Comparison unavailable")
  })
})

describe("reviewEmptyCopy", () => {
  it("returns title and description for each empty kind", () => {
    const noVersions = reviewEmptyCopy("no_versions")
    assert.equal(noVersions.title, "No versions yet")
    assert.match(noVersions.description, /Upload your first video/)

    const needTwo = reviewEmptyCopy("need_two_versions")
    assert.equal(needTwo.title, "Need at least two versions")
  })
})

describe("reviewMissingMessage", () => {
  it("returns not-found copy per surface", () => {
    assert.equal(reviewMissingMessage("project"), "Project not found.")
    assert.equal(reviewMissingMessage("deliverable"), "Deliverable not found.")
  })
})

describe("resolveAsyncViewState", () => {
  it("prefers loading over error and missing", () => {
    assert.deepEqual(
      resolveAsyncViewState({
        loading: true,
        error: "boom",
        missing: true,
        surface: "project",
      }),
      { status: "loading" },
    )
  })

  it("returns error message when present", () => {
    assert.deepEqual(
      resolveAsyncViewState({
        loading: false,
        error: "Failed to load",
        missing: true,
        surface: "deliverable",
      }),
      { status: "error", message: "Failed to load" },
    )
  })

  it("returns surface missing message when data is absent", () => {
    assert.deepEqual(
      resolveAsyncViewState({
        loading: false,
        error: null,
        missing: true,
        surface: "compare",
      }),
      { status: "error", message: "Deliverable not found." },
    )
  })

  it("returns ready when loaded without error", () => {
    assert.deepEqual(
      resolveAsyncViewState({ loading: false, error: null }),
      { status: "ready" },
    )
  })
})
