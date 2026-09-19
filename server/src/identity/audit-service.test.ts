import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { AUDIT_EVENT_TYPES } from "@playblast/shared"
import {
  buildAuditEventsCsv,
  parseAuditEventTypeFilter,
  parseAuditPagination,
} from "./audit-service.js"

describe("audit service helpers", () => {
  it("parses pagination with bounds", () => {
    assert.deepEqual(parseAuditPagination("25", "10"), { limit: 25, offset: 10 })
    assert.deepEqual(parseAuditPagination("999", "-5"), { limit: 200, offset: 0 })
    assert.deepEqual(parseAuditPagination(undefined, undefined), { limit: 50, offset: 0 })
  })

  it("accepts known audit event types only", () => {
    assert.equal(
      parseAuditEventTypeFilter(AUDIT_EVENT_TYPES.loginFailed),
      AUDIT_EVENT_TYPES.loginFailed,
    )
    assert.equal(parseAuditEventTypeFilter("unknown.event"), undefined)
  })

  it("builds escaped CSV rows", () => {
    const csv = buildAuditEventsCsv([
      {
        id: "evt-1",
        eventType: AUDIT_EVENT_TYPES.loginFailed,
        eventLabel: "Login failed",
        studioId: "studio-1",
        userId: null,
        actorName: null,
        actorEmail: null,
        metadata: { email: 'bad"user@example.com' },
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ])

    assert.match(csv, /Login failed/)
    assert.ok(csv.includes('""email"":""bad\\""user@example.com""'))
  })
})
