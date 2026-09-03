import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const e2eRoot = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PLAYBLAST_E2E_PORT ?? 3199)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: path.join(e2eRoot, "specs"),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  // The setup and workflow projects intentionally share one mutable fixture;
  // retries must restart the whole command with a fresh database instead.
  retries: 0,
  reporter: [["list"]],
  globalSetup: path.join(e2eRoot, "global-setup.ts"),
  globalTeardown: path.join(e2eRoot, "global-teardown.ts"),
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /docker-bootstrap\.spec\.ts/],
    },
    {
      name: "docker-bootstrap",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /docker-bootstrap\.spec\.ts/,
      timeout: 300_000,
    },
  ],
})
