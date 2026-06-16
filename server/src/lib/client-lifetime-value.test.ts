import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  accumulateClientLifetimeValue,
  emptyClientLifetimeValue,
  isActiveLifetimeProjectStatus,
  isCompletedLifetimeProjectStatus,
} from "./client-lifetime-value.js"

describe("client-lifetime-value", () => {
  it("classifies active and completed project statuses", () => {
    assert.equal(isActiveLifetimeProjectStatus("active"), true)
    assert.equal(isActiveLifetimeProjectStatus("on_hold"), true)
    assert.equal(isActiveLifetimeProjectStatus("completed"), false)
    assert.equal(isCompletedLifetimeProjectStatus("completed"), true)
    assert.equal(isCompletedLifetimeProjectStatus("active"), false)
  })

  it("accumulates estimates into total, active, and completed buckets", () => {
    let value = emptyClientLifetimeValue()

    value = accumulateClientLifetimeValue(value, "active", 1000)
    value = accumulateClientLifetimeValue(value, "on_hold", 500)
    value = accumulateClientLifetimeValue(value, "completed", 2500)

    assert.deepEqual(value, {
      totalEstimated: 4000,
      activeEstimated: 1500,
      completedEstimated: 2500,
    })
  })
})
