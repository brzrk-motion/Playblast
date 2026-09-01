import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isProduction } from "../config/env.js"
import { __testOnly_serializeCookie } from "../auth/cookies.js"

describe("session cookies", () => {
  it("marks session cookies HttpOnly and SameSite=Strict", () => {
    const serialized = __testOnly_serializeCookie("playblast_session", "token", {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "strict",
      path: "/",
      maxAgeMs: 60_000,
    })

    assert.match(serialized, /HttpOnly/)
    assert.match(serialized, /SameSite=Strict/)
    assert.match(serialized, /Path=\//)
  })
})
