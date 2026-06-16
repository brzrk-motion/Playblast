import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calculateProjectProfitability,
  formatMarginPercent,
  marginStatus,
} from "./profitability.js"

describe("marginStatus", () => {
  it("classifies margin tiers", () => {
    assert.equal(marginStatus(75), "healthy")
    assert.equal(marginStatus(60), "warning")
    assert.equal(marginStatus(50), "warning")
    assert.equal(marginStatus(39.9), "critical")
  })
})

describe("formatMarginPercent", () => {
  it("rounds to one decimal place", () => {
    assert.equal(formatMarginPercent(62.34), "62.3%")
  })
})

describe("calculateProjectProfitability", () => {
  it("returns billed rate only when no internal cost rate is set", () => {
    const result = calculateProjectProfitability({
      estimatedHours: 10,
      estimatedValue: 4200,
    })

    assert.equal(result.actualHours, 0)
    assert.equal(result.costBasis, null)
    assert.equal(result.marginPercent, null)
    assert.equal(result.billedHourlyRate, 420)
    assert.equal(result.isEstimatedMargin, true)
  })

  it("uses estimated hours for cost when actual hours are zero", () => {
    const result = calculateProjectProfitability({
      estimatedHours: 10,
      estimatedValue: 4200,
      actualHours: 0,
      internalHourlyCostRate: 120,
    })

    assert.equal(result.costBasis, 1200)
    assert.equal(result.marginPercent, 71.42857142857143)
    assert.equal(result.isEstimatedMargin, true)
    assert.equal(result.effectiveHourlyRate, null)
  })

  it("uses actual hours for cost when time has been logged", () => {
    const result = calculateProjectProfitability({
      estimatedHours: 10,
      estimatedValue: 4200,
      actualHours: 12,
      internalHourlyCostRate: 120,
    })

    assert.equal(result.costBasis, 1440)
    assert.equal(result.marginPercent, (4200 - 1440) / 4200 * 100)
    assert.equal(result.isEstimatedMargin, false)
    assert.equal(result.effectiveHourlyRate, 350)
  })

  it("shows effective hourly rate when time has been logged", () => {
    const result = calculateProjectProfitability({
      estimatedHours: 10,
      estimatedValue: 4200,
      actualHours: 10,
      internalHourlyCostRate: 120,
    })

    assert.equal(result.effectiveHourlyRate, 420)
  })
})
