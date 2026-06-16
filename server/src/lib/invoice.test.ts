import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  addDaysToIsoDate,
  computeInvoiceStatus,
  computeOutstandingBalance,
  isInvoiceOverdue,
} from "./invoice.js"

describe("invoice helpers", () => {
  it("computes invoice status from payments", () => {
    assert.equal(computeInvoiceStatus(1000, 0), "unpaid")
    assert.equal(computeInvoiceStatus(1000, 250), "partially_paid")
    assert.equal(computeInvoiceStatus(1000, 1000), "paid")
    assert.equal(computeInvoiceStatus(1000, 1200), "paid")
  })

  it("computes outstanding balance", () => {
    assert.equal(computeOutstandingBalance(1000, 250), 750)
    assert.equal(computeOutstandingBalance(1000, 1000), 0)
    assert.equal(computeOutstandingBalance(1000, 1200), 0)
  })

  it("detects overdue invoices", () => {
    const today = new Date("2026-06-16")
    assert.equal(
      isInvoiceOverdue("2026-06-15", "unpaid", today),
      true,
    )
    assert.equal(
      isInvoiceOverdue("2026-06-16", "unpaid", today),
      false,
    )
    assert.equal(
      isInvoiceOverdue("2026-06-15", "paid", today),
      false,
    )
  })

  it("adds days to an ISO date", () => {
    assert.equal(addDaysToIsoDate("2026-06-16", 7), "2026-06-23")
    assert.equal(addDaysToIsoDate("2026-06-16", 30), "2026-07-16")
  })
})
