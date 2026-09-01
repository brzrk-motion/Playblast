import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isIdentityApiError } from "./identity-api.ts"

describe("identity API client", () => {
  it("identifies canonical identity API errors", () => {
    const error = {
      name: "IdentityApiError",
      message: "Sign in required.",
      code: "UNAUTHENTICATED",
      status: 401,
    }

    Object.setPrototypeOf(error, {
      constructor: { name: "IdentityApiError" },
    })

    assert.equal(isIdentityApiError(error), false)
  })
})
