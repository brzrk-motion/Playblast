import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  estimateBudgetStatus,
  estimateBudgetVariance,
  estimateBudgetVariancePercent,
} from "./budget.js"

describe("estimateBudgetVariance", () => {
  it("returns positive when estimate is under budget", () => {
    assert.equal(estimateBudgetVariance(10_000, 8_000), 2_000)
  })

  it("returns negative when estimate exceeds budget", () => {
    assert.equal(estimateBudgetVariance(10_000, 12_000), -2_000)
  })
})

describe("estimateBudgetVariancePercent", () => {
  it("returns percentage of budget remaining", () => {
    assert.equal(estimateBudgetVariancePercent(10_000, 8_000), 20)
  })

  it("returns negative percentage when over budget", () => {
    assert.equal(estimateBudgetVariancePercent(10_000, 11_000), -10)
  })

  it("returns zero when budget is unset or zero", () => {
    assert.equal(estimateBudgetVariancePercent(0, 5_000), 0)
  })
})

describe("estimateBudgetStatus", () => {
  it("returns healthy when no budget is set", () => {
    assert.equal(estimateBudgetStatus(undefined, 5_000), "healthy")
    assert.equal(estimateBudgetStatus(null, 5_000), "healthy")
    assert.equal(estimateBudgetStatus(0, 5_000), "healthy")
  })

  it("returns healthy when estimate is comfortably under budget", () => {
    assert.equal(estimateBudgetStatus(10_000, 8_000), "healthy")
  })

  it("returns warning when estimate is within 10% of budget", () => {
    assert.equal(estimateBudgetStatus(10_000, 9_500), "warning")
    assert.equal(estimateBudgetStatus(10_000, 10_000), "warning")
  })

  it("returns over when estimate exceeds budget", () => {
    assert.equal(estimateBudgetStatus(10_000, 10_001), "over")
  })
})
