import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  getWeekEnd,
  getWeekStartFromDate,
  isIsoDate,
} from "./timesheet.js"

describe("timesheet utilities", () => {
  it("validates ISO dates", () => {
    assert.equal(isIsoDate("2026-06-16"), true)
    assert.equal(isIsoDate("2026-13-01"), false)
    assert.equal(isIsoDate("06-16-2026"), false)
  })

  it("returns Monday for a Wednesday", () => {
    const wednesday = new Date(2026, 5, 18)
    assert.equal(getWeekStartFromDate(wednesday), "2026-06-15")
    assert.equal(getWeekEnd("2026-06-15"), "2026-06-21")
  })

  it("returns Monday for a Sunday", () => {
    const sunday = new Date(2026, 5, 21)
    assert.equal(getWeekStartFromDate(sunday), "2026-06-15")
  })
})
