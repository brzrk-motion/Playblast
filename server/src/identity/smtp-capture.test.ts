import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { getSmtpTransport, setSmtpTransport } from "./smtp-transport.js"
import { disableE2ETestRuntime, enableE2ETestRuntime } from "../e2e-runtime.js"

describe("SMTP capture transport", () => {
  const previousCapture = process.env.PLAYBLAST_SMTP_CAPTURE_DIR
  const previousTestMode = process.env.PLAYBLAST_E2E_TEST_MODE
  let tempDir = ""

  afterEach(() => {
    setSmtpTransport(null)
    disableE2ETestRuntime()
    if (previousCapture === undefined) {
      delete process.env.PLAYBLAST_SMTP_CAPTURE_DIR
    } else {
      process.env.PLAYBLAST_SMTP_CAPTURE_DIR = previousCapture
    }
    if (previousTestMode === undefined) {
      delete process.env.PLAYBLAST_E2E_TEST_MODE
    } else {
      process.env.PLAYBLAST_E2E_TEST_MODE = previousTestMode
    }
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = ""
    }
  })

  it("writes outbound messages to PLAYBLAST_SMTP_CAPTURE_DIR", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-smtp-capture-"))
    process.env.PLAYBLAST_E2E_TEST_MODE = "1"
    process.env.PLAYBLAST_SMTP_CAPTURE_DIR = tempDir
    enableE2ETestRuntime()
    setSmtpTransport(null)

    const transport = getSmtpTransport()
    const result = await transport.send(
      {
        host: "capture.local",
        port: 587,
        username: null,
        password: "unused",
        fromEmail: "noreply@capture.local",
        tlsMode: "starttls",
        timeoutMs: 1000,
      },
      {
        to: "member@capture.local",
        subject: "Invite",
        text: "Accept at http://127.0.0.1:3000/invite/fixture-token",
        html: "<p>invite</p>",
      },
    )

    assert.equal(result.accepted, true)
    const files = fs.readdirSync(tempDir).filter((name) => name.endsWith(".json"))
    assert.equal(files.length, 1)
    const payload = JSON.parse(fs.readFileSync(path.join(tempDir, files[0]!), "utf8")) as {
      to: string
      text: string
    }
    assert.equal(payload.to, "member@capture.local")
    assert.match(payload.text, /\/invite\/fixture-token/)
  })
})
