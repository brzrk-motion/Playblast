import { enableE2ETestRuntime } from "./e2e-runtime.js"

if (process.env.PLAYBLAST_E2E_TEST_MODE !== "1") {
  throw new Error("The E2E server entry point requires PLAYBLAST_E2E_TEST_MODE=1.")
}

enableE2ETestRuntime()
await import("./index.js")
