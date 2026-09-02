import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { createApiError } from "@playblast/shared"
import { ApiError, getForbiddenMessage } from "./api-http.ts"

describe("api-http", () => {
  it("preserves structured forbidden errors", () => {
    const error = new ApiError(403, createApiError("FORBIDDEN"))
    assert.equal(getForbiddenMessage(error), createApiError("FORBIDDEN").error)
  })

  it("returns null for non-forbidden errors", () => {
    const error = new ApiError(401, createApiError("SESSION_EXPIRED"))
    assert.equal(getForbiddenMessage(error), null)
  })
})
