import { expect, test } from "@playwright/test"
import fs from "node:fs"
import net, { type Server } from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { E2E_ADMIN } from "../credentials.js"
import { completeFirstRunSetup } from "../helpers/auth.js"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function composeAvailable(): boolean {
  const docker = spawnSync("docker", ["info"], { encoding: "utf8" })
  if (docker.status !== 0) {
    return false
  }
  const compose = spawnSync("docker", ["compose", "version"], { encoding: "utf8" })
  return compose.status === 0
}

function findSelfContainerId(): string | null {
  if (!fs.existsSync("/.dockerenv")) {
    return null
  }
  const hostname = fs.readFileSync("/etc/hostname", "utf8").trim()
  const listed = spawnSync("docker", ["ps", "--format", "{{.ID}} {{.Names}}"], {
    encoding: "utf8",
  })
  if (listed.status !== 0) {
    return null
  }
  for (const line of listed.stdout.split("\n")) {
    const [id, name] = line.trim().split(/\s+/, 2)
    if (!id || !name) continue
    const inspect = spawnSync(
      "docker",
      ["inspect", "-f", "{{.Config.Hostname}} {{.Name}}", id],
      { encoding: "utf8" },
    )
    if (inspect.status !== 0) continue
    const [containerHostname, containerName] = inspect.stdout.trim().split(/\s+/, 2)
    if (
      containerHostname === hostname ||
      containerName === `/${hostname}` ||
      name.includes(hostname)
    ) {
      return id
    }
  }
  return null
}

function containerIpOnNetwork(containerId: string, network: string): string {
  const result = spawnSync(
    "docker",
    [
      "inspect",
      "-f",
      `{{(index .NetworkSettings.Networks "${network}").IPAddress}}`,
      containerId,
    ],
    { encoding: "utf8" },
  )
  if (result.status !== 0) {
    throw new Error(`failed to resolve container IP on ${network}: ${result.stderr}`)
  }
  const ip = result.stdout.trim()
  if (!ip) {
    throw new Error(`container ${containerId} has no IP on ${network}`)
  }
  return ip
}

function startLoopbackProxy(upstreamHost: string): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((client) => {
      const upstream = net.connect(3000, upstreamHost)
      client.pipe(upstream)
      upstream.pipe(client)
      client.on("error", () => upstream.destroy())
      upstream.on("error", () => client.destroy())
    })
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close()
        reject(new Error("failed to allocate loopback proxy port"))
        return
      }
      resolve({ server, port: address.port })
    })
  })
}

test.describe("Docker-backed clean install", () => {
  test.skip(!composeAvailable(), "Docker Compose unavailable")

  test("first install health and browser bootstrap", async ({ page }) => {
    const project = `playblast-e2e-${process.pid}`
    const network = `${project}_default`
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-e2e-docker-"))
    const dataDir = path.join(tempDir, "data")
    const uploadsDir = path.join(tempDir, "uploads")
    const smtpDir = path.join(tempDir, "smtp")
    fs.mkdirSync(dataDir, { recursive: true })
    fs.mkdirSync(uploadsDir, { recursive: true })
    fs.mkdirSync(smtpDir, { recursive: true })

    const selfContainerId = findSelfContainerId()
    let connectedNetwork = false
    let proxyServer: Server | null = null
    const image = `${project}:latest`

    const overridePath = path.join(tempDir, "docker-compose.e2e.yml")
    // Nested Docker environments often cannot reach published host ports; prefer
    // joining the compose network and talking to the service container IP.
    fs.writeFileSync(
      overridePath,
      `
services:
  playblast:
    image: ${image}
    command: ["node", "server/dist/e2e-entry.js"]
    ports: !reset []
    environment:
      SESSION_SECRET: e2e-docker-session-secret-32chars-min
      PLAYBLAST_E2E_TEST_MODE: "1"
      PLAYBLAST_SMTP_CAPTURE_DIR: /app/smtp-capture
      PLAYBLAST_EMERGENCY_BASIC_AUTH: "false"
    volumes: !override
      - ${dataDir}:/app/data
      - ${uploadsDir}:/app/uploads
      - ${smtpDir}:/app/smtp-capture
`,
    )

    const env = {
      ...process.env,
      SESSION_SECRET: "e2e-docker-session-secret-32chars-min",
      COMPOSE_PROJECT_NAME: project,
    }

    const composeArgs = [
      "compose",
      "-f",
      "docker-compose.yml",
      "-f",
      overridePath,
    ] as const

    try {
      const up = spawnSync("docker", [...composeArgs, "up", "-d", "--build"], {
        cwd: repoRoot,
        env,
        encoding: "utf8",
      })
      if (up.status !== 0) {
        throw new Error(`docker compose up failed:\n${up.stdout}\n${up.stderr}`)
      }

      const serviceId = spawnSync("docker", ["compose", "-p", project, "ps", "-q"], {
        encoding: "utf8",
      })
        .stdout.trim()
        .split("\n")[0]
      if (!serviceId) {
        throw new Error("docker compose did not report a playblast container id")
      }

      if (selfContainerId) {
        const connect = spawnSync(
          "docker",
          ["network", "connect", network, selfContainerId],
          { encoding: "utf8" },
        )
        if (connect.status !== 0 && !/already exists/i.test(connect.stderr)) {
          throw new Error(
            `failed to connect runner to ${network}: ${connect.stdout}\n${connect.stderr}`,
          )
        }
        connectedNetwork = true
      }

      const serviceIp = containerIpOnNetwork(serviceId, network)
      const proxy = await startLoopbackProxy(serviceIp)
      proxyServer = proxy.server
      const baseUrl = `http://127.0.0.1:${proxy.port}`

      const started = Date.now()
      let healthy = false
      while (Date.now() - started < 180_000) {
        try {
          const health = await fetch(`${baseUrl}/health`)
          if (health.ok) {
            const body = (await health.json()) as { status?: string }
            if (body.status === "ok") {
              healthy = true
              break
            }
          }
        } catch {
          // retry
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      if (!healthy) {
        const logs = spawnSync(
          "docker",
          [...composeArgs, "logs", "--no-color", "--tail", "80"],
          { cwd: repoRoot, env, encoding: "utf8" },
        )
        throw new Error(
          `Docker E2E container never became healthy on ${baseUrl}\n${logs.stdout}\n${logs.stderr}`,
        )
      }

      const setup = await fetch(`${baseUrl}/api/setup/status`)
      expect(setup.status).toBe(200)
      const setupBody = (await setup.json()) as { status: string }
      expect(setupBody.status).toBe("pending")

      await page.goto(`${baseUrl}/setup`)
      await page.getByLabel("Your name").fill("Invalid Setup")
      await page.getByLabel("Email").fill("not-an-email")
      await page.getByLabel("Password", { exact: true }).fill("short")
      await page.getByLabel("Confirm password").fill("different")
      await page.getByRole("button", { name: "Create admin account" }).click()
      await expect(page.getByRole("alert")).toBeVisible()
      await expect(page).toHaveURL(/\/setup$/)

      await completeFirstRunSetup(
        page,
        {
          name: E2E_ADMIN.name,
          email: `docker-${E2E_ADMIN.email}`,
          password: E2E_ADMIN.password,
          studioName: "Docker E2E Studio",
        },
        baseUrl,
      )
      await expect(page).not.toHaveURL(/\/setup/)

      const duplicateSetup = await fetch(`${baseUrl}/api/setup/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Second Admin",
          email: "second-admin@e2e.fixture",
          password: E2E_ADMIN.password,
          confirmPassword: E2E_ADMIN.password,
        }),
      })
      expect(duplicateSetup.status).toBe(409)

      const restart = spawnSync("docker", [...composeArgs, "restart", "playblast"], {
        cwd: repoRoot,
        env,
        encoding: "utf8",
      })
      if (restart.status !== 0) {
        throw new Error(`docker compose restart failed:\n${restart.stdout}\n${restart.stderr}`)
      }

      const restartedAt = Date.now()
      let restarted = false
      while (Date.now() - restartedAt < 120_000) {
        try {
          const health = await fetch(`${baseUrl}/health`)
          if (health.ok) {
            restarted = true
            break
          }
        } catch {
          // retry
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      expect(restarted).toBe(true)
      const persistedSetup = await fetch(`${baseUrl}/api/setup/status`)
      expect(persistedSetup.status).toBe(200)
      expect(((await persistedSetup.json()) as { status: string }).status).toBe("complete")

      await page.context().clearCookies()
      await page.goto(`${baseUrl}/login`)
      await page.getByLabel("Email").fill(`docker-${E2E_ADMIN.email}`)
      await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password)
      await page.getByRole("button", { name: "Sign in" }).click()
      await page.waitForURL((url) => !url.pathname.startsWith("/login"))
      await expect(page.getByText("Docker E2E Studio").first()).toBeVisible()
    } finally {
      const cleanupErrors: string[] = []
      if (proxyServer) {
        proxyServer.close()
      }
      if (connectedNetwork && selfContainerId) {
        const disconnect = spawnSync("docker", ["network", "disconnect", network, selfContainerId], {
          encoding: "utf8",
        })
        if (disconnect.status !== 0) {
          cleanupErrors.push(`network disconnect failed: ${disconnect.stderr}`)
        }
      }
      const down = spawnSync("docker", [...composeArgs, "down", "-v", "--remove-orphans"], {
        cwd: repoRoot,
        env,
        encoding: "utf8",
      })
      if (down.status !== 0) {
        cleanupErrors.push(`compose down failed: ${down.stderr}`)
      }
      const removeImage = spawnSync("docker", ["image", "rm", "-f", image], {
        encoding: "utf8",
      })
      if (removeImage.status !== 0 && !/No such image/i.test(removeImage.stderr)) {
        cleanupErrors.push(`image cleanup failed: ${removeImage.stderr}`)
      }
      fs.rmSync(tempDir, { recursive: true, force: true })
      if (cleanupErrors.length > 0) {
        throw new Error(`Docker E2E cleanup failed:\n${cleanupErrors.join("\n")}`)
      }
    }
  })
})
