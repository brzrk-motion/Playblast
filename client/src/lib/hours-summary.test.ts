import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  formatSignedHoursDelta,
  hoursDeltaStatus,
} from "./hours-summary.js"

describe("hoursDeltaStatus", () => {
  it("flags over when logged exceeds estimate", () => {
    assert.equal(hoursDeltaStatus(100, 101), "over")
  })

  it("flags warning when within 10% of estimate but not over", () => {
    assert.equal(hoursDeltaStatus(100, 90), "warning")
    assert.equal(hoursDeltaStatus(100, 100), "warning")
  })

  it("flags healthy when well under estimate", () => {
    assert.equal(hoursDeltaStatus(100, 89), "healthy")
  })
})

describe("formatSignedHoursDelta", () => {
  it("formats signed hour deltas", () => {
    assert.equal(formatSignedHoursDelta(2.5), "+2.5h")
    assert.equal(formatSignedHoursDelta(-3), "-3h")
    assert.equal(formatSignedHoursDelta(0), "0h")
  })
})
