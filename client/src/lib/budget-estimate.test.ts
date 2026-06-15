import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  ESTIMATE_BUDGET_STATUS_DOT_STYLES,
  estimateBudgetStatus,
} from "./budget.js"

describe("ESTIMATE_BUDGET_STATUS_DOT_STYLES", () => {
  it("maps each status to a dot color class", () => {
    assert.equal(ESTIMATE_BUDGET_STATUS_DOT_STYLES.healthy, "bg-status-success")
    assert.equal(ESTIMATE_BUDGET_STATUS_DOT_STYLES.warning, "bg-status-warning")
    assert.equal(ESTIMATE_BUDGET_STATUS_DOT_STYLES.over, "bg-destructive")
  })
})

describe("estimateBudgetStatus for card health dots", () => {
  it("returns warning when estimate is within 10% of budget", () => {
    assert.equal(estimateBudgetStatus(4200, 4000), "warning")
  })

  it("returns over when estimate exceeds budget", () => {
    assert.equal(estimateBudgetStatus(4000, 4200), "over")
  })
})
