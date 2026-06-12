import assert from "node:assert/strict"
import { test } from "node:test"

import {
  pickCompareVersionLabels,
  sortVersionsByDate,
} from "../../../client/src/lib/versions.ts"
import type { Version } from "../../../client/src/types/version.ts"

const versions: Version[] = [
  {
    id: "1",
    projectId: "demo",
    label: "v1",
    filename: "a.mp4",
    uploadedAt: "2026-01-01T00:00:00.000Z",
    status: "pending_review",
  },
  {
    id: "2",
    projectId: "demo",
    label: "v2",
    filename: "b.mp4",
    uploadedAt: "2026-02-01T00:00:00.000Z",
    status: "needs_revision",
  },
  {
    id: "3",
    projectId: "demo",
    label: "v3",
    filename: "c.mp4",
    uploadedAt: "2026-03-01T00:00:00.000Z",
    status: "approved",
  },
]

test("sortVersionsByDate orders newest versions first", () => {
  const sorted = sortVersionsByDate(versions)
  assert.equal(sorted[0]?.label, "v3")
  assert.equal(sorted[2]?.label, "v1")
})

test("pickCompareVersionLabels defaults to newest and second-newest", () => {
  const picked = pickCompareVersionLabels(versions)
  assert.deepEqual(picked, { left: "v3", right: "v2" })
})

test("pickCompareVersionLabels honors valid URL labels", () => {
  const picked = pickCompareVersionLabels(versions, "v1", "v3")
  assert.deepEqual(picked, { left: "v1", right: "v3" })
})

test("pickCompareVersionLabels falls back when labels are invalid", () => {
  const picked = pickCompareVersionLabels(versions, "missing", "v2")
  assert.deepEqual(picked, { left: "v3", right: "v2" })
})
