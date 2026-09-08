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

  it("keeps Secure gated on production NODE_ENV (not weakened for plain HTTP)", () => {
    const withSecure = __testOnly_serializeCookie("playblast_session", "token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    })
    const withoutSecure = __testOnly_serializeCookie("playblast_session", "token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    })

    assert.match(withSecure, /Secure/)
    assert.doesNotMatch(withoutSecure, /Secure/)
    // Contract: production uses Secure via isProduction(); never force-off for LAN HTTP.
    if (isProduction()) {
      assert.match(
        __testOnly_serializeCookie("c", "v", {
          httpOnly: true,
          secure: isProduction(),
          sameSite: "strict",
        }),
        /Secure/,
      )
    }
  })
})
