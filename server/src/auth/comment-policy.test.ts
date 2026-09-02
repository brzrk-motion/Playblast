import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  canCreateComment,
  canDeleteComment,
  canUpdateComment,
} from "./comment-policy.js"
import type { Comment } from "../types/comment.js"

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    versionId: "version-1",
    timestamp: 1,
    body: "Adjust the highlight",
    author: "Fixture Creative",
    authorUserId: "user-creative",
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    ...overrides,
  }
}

describe("comment policy", () => {
  it("allows all roles with comments.create to add comments", () => {
    assert.deepEqual(canCreateComment("admin"), { allowed: true })
    assert.deepEqual(canCreateComment("creative"), { allowed: true })
    assert.deepEqual(canCreateComment("proofing"), { allowed: true })
  })

  it("allows authors and admins to edit comment bodies", () => {
    const existing = comment()

    assert.deepEqual(
      canUpdateComment(existing, { userId: "user-creative", role: "creative" }, { body: "Updated" }),
      { allowed: true },
    )
    assert.deepEqual(
      canUpdateComment(existing, { userId: "user-admin", role: "admin" }, { body: "Updated" }),
      { allowed: true },
    )
    assert.deepEqual(
      canUpdateComment(existing, { userId: "user-proofing", role: "proofing" }, { body: "Updated" }),
      { allowed: false, reason: "forbidden" },
    )
  })

  it("requires approval capability to resolve comments", () => {
    const existing = comment()

    assert.deepEqual(
      canUpdateComment(existing, { userId: "user-creative", role: "creative" }, { resolved: true }),
      { allowed: true },
    )
    assert.deepEqual(
      canUpdateComment(existing, { userId: "user-proofing", role: "proofing" }, { resolved: true }),
      { allowed: false, reason: "forbidden" },
    )
  })

  it("allows admins to moderate legacy comments without authorUserId", () => {
    const legacy = comment({ authorUserId: null })

    assert.deepEqual(
      canDeleteComment(legacy, { userId: "user-proofing", role: "proofing" }),
      { allowed: false, reason: "forbidden" },
    )
    assert.deepEqual(
      canDeleteComment(legacy, { userId: "user-admin", role: "admin" }),
      { allowed: true },
    )
  })
})
