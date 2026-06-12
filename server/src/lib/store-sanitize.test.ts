import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isPlaceholderComment, sanitizeStore } from "./store-sanitize.js"
import type { Comment } from "../types/comment.js"

function makeComment(body: string): Comment {
  return {
    id: "comment-1",
    versionId: "version-1",
    timestamp: 1,
    body,
    author: "Alex",
    createdAt: "2026-06-01T10:00:00.000Z",
    resolved: false,
  }
}

describe("store sanitization", () => {
  it("detects placeholder comment copy", () => {
    assert.equal(isPlaceholderComment(makeComment("Update customize text here")), true)
    assert.equal(
      isPlaceholderComment(makeComment("  update customize text here  ")),
      true,
    )
    assert.equal(isPlaceholderComment(makeComment("Soften the highlight")), false)
  })

  it("removes placeholder comments from the store", () => {
    const store = sanitizeStore({
      projects: [],
      versions: [],
      comments: [
        makeComment("Update customize text here"),
        makeComment("Needs another pass on lighting"),
      ],
    })

    assert.equal(store.comments.length, 1)
    assert.equal(store.comments[0]?.body, "Needs another pass on lighting")
  })
})
