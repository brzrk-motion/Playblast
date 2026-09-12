import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import assert from "node:assert/strict"

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..")
const app = readFileSync(join(srcDir, "App.tsx"), "utf8")
const dashboard = readFileSync(join(srcDir, "pages/dashboard.tsx"), "utf8")

describe("client route code splitting", () => {
  it("lazy-loads pages instead of static page imports", () => {
    assert.match(app, /lazy\(\(\) => import\("@\/pages\//)
    assert.doesNotMatch(app, /import \{[^}]*Page[^}]*\} from "@\/pages\//)
  })
})

describe("dashboard heavy-module code splitting", () => {
  it("lazy-loads the revenue chart and capacity widget", () => {
    assert.match(
      dashboard,
      /lazy\(\(\) => import\("@\/components\/dashboard\/monthly-revenue-chart"\)/,
    )
    assert.match(
      dashboard,
      /lazy\(\(\) => import\("@\/components\/capacity\/capacity-view"\)/,
    )
    assert.doesNotMatch(
      dashboard,
      /from "@\/components\/dashboard\/monthly-revenue-chart"/,
    )
    assert.doesNotMatch(
      dashboard,
      /from "@\/components\/capacity\/capacity-view"/,
    )
  })
})
