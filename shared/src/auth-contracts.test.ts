import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { PASSWORD_POLICY } from "@playblast/shared"

describe("auth contracts", () => {
  it("documents the password policy for setup and recovery flows", () => {
    assert.equal(PASSWORD_POLICY.minLength, 12)
    assert.equal(PASSWORD_POLICY.requireLetter, true)
    assert.equal(PASSWORD_POLICY.requireNumber, true)
  })
})
