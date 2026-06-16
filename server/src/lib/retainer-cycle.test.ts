import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  computeRetainerSummary,
  getCurrentCycleStart,
  getCycleEnd,
} from "./retainer-cycle.js"

describe("retainer cycle helpers", () => {
  it("returns the current cycle start based on cycle day", () => {
    const reference = new Date("2026-06-15T12:00:00")
    assert.equal(getCurrentCycleStart(1, reference), "2026-06-01")
    assert.equal(getCurrentCycleStart(20, reference), "2026-05-20")
  })

  it("computes utilization and overage", () => {
    const summary = computeRetainerSummary({
      retainerHours: 10,
      retainerRate: 50,
      retainerCycleDay: 1,
      hoursLogged: 12,
      referenceDate: new Date("2026-06-15T12:00:00"),
    })

    assert.equal(summary.hoursRemaining, 0)
    assert.equal(summary.estimatedValue, 500)
    assert.equal(summary.utilizationPercent, 120)
    assert.equal(summary.isOverage, true)
    assert.equal(summary.cycleEnd, getCycleEnd(summary.cycleStart))
  })
})
