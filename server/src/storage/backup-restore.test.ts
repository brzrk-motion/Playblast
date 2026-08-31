import { execFileSync } from "node:child_process"
import path from "node:path"
import { describe, it } from "node:test"
import assert from "node:assert/strict"

const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../..",
)
const scriptPath = path.join(repoRoot, "scripts/validate-backup-restore.sh")

describe("validate-backup-restore", () => {
  it("restores SQLite data and uploads from a tar backup", () => {
    const output = execFileSync("bash", [scriptPath], {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    assert.match(output, /Backup\/restore verification passed/)
    assert.match(output, /filesystem/)
  })
})
