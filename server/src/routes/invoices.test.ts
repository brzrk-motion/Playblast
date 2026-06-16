import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import {
  createClient,
  createProject,
  createService,
  linkServiceToProject,
} from "../storage/repository.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-invoices-"))
  dbPath = path.join(tempDir, "test.db")
  process.env.DB_PATH = dbPath
  initDatabase(dbPath)

  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server")
  }

  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  delete process.env.DB_PATH
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("invoice API", () => {
  it("rejects invoice generation when no client is linked", async () => {
    const project = createProject({ name: "No Client Project" })
    const service = createService({
      name: "Animation",
      hourEstimate: 10,
      hourlyRate: 150,
      type: "animated",
    })
    linkServiceToProject(project.id, service.id)

    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/invoices`,
      { method: "POST" },
    )

    assert.equal(response.status, 400)
    const body = (await response.json()) as { error: string }
    assert.match(body.error, /client/i)
  })

  it("rejects invoice generation when no services are attached", async () => {
    const client = createClient({
      name: "Acme Contact",
      email: "billing@acme.test",
      company: "Acme Corp",
    })
    const project = createProject({
      name: "Empty Services Project",
      clientId: client.id,
    })

    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/invoices`,
      { method: "POST" },
    )

    assert.equal(response.status, 400)
    const body = (await response.json()) as { error: string }
    assert.match(body.error, /service/i)
  })

  it("creates an invoice, lists it, and downloads a PDF", async () => {
    const client = createClient({
      name: "Jane Client",
      email: "jane@example.test",
      company: "Example Inc",
    })
    const project = createProject({
      name: "Brand Spot",
      clientId: client.id,
      budget: { total: 5000, currency: "USD" },
    })
    const service = createService({
      name: "Motion Design",
      hourEstimate: 8,
      hourlyRate: 200,
      type: "animated",
    })
    linkServiceToProject(project.id, service.id)

    const createResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/invoices`,
      { method: "POST" },
    )

    assert.equal(createResponse.status, 201)
    const invoice = (await createResponse.json()) as {
      id: string
      invoiceNumber: number
      projectName: string
      clientName: string
      clientCompany: string
      clientEmail: string
      grandTotal: number
      lineItems: Array<{
        serviceName: string
        hours: number
        hourlyRate: number
        lineTotal: number
      }>
      invoiceDate: string
    }

    assert.equal(invoice.invoiceNumber, 1)
    assert.equal(invoice.projectName, "Brand Spot")
    assert.equal(invoice.clientName, "Jane Client")
    assert.equal(invoice.clientCompany, "Example Inc")
    assert.equal(invoice.clientEmail, "jane@example.test")
    assert.equal(invoice.grandTotal, 1600)
    assert.equal(invoice.lineItems.length, 1)
    assert.equal(invoice.lineItems[0]?.serviceName, "Motion Design")
    assert.equal(invoice.lineItems[0]?.lineTotal, 1600)
    assert.ok(invoice.invoiceDate)

    const listResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/invoices`,
    )
    assert.equal(listResponse.status, 200)
    const invoices = (await listResponse.json()) as Array<{ id: string }>
    assert.equal(invoices.length, 1)
    assert.equal(invoices[0]?.id, invoice.id)

    const pdfResponse = await fetch(
      `${baseUrl}/api/invoices/${invoice.id}/pdf`,
    )
    assert.equal(pdfResponse.status, 200)
    assert.equal(pdfResponse.headers.get("content-type"), "application/pdf")
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())
    assert.ok(pdfBuffer.length > 100)
    assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF")
  })

  it("auto-increments invoice numbers across projects", async () => {
    const client = createClient({
      name: "Repeat Client",
      email: "repeat@example.test",
    })

    const projectA = createProject({ name: "Project A", clientId: client.id })
    const projectB = createProject({ name: "Project B", clientId: client.id })
    const service = createService({
      name: "Static Render",
      hourEstimate: 2,
      hourlyRate: 100,
      type: "static",
    })
    linkServiceToProject(projectA.id, service.id)
    linkServiceToProject(projectB.id, service.id)

    const first = await fetch(`${baseUrl}/api/projects/${projectA.id}/invoices`, {
      method: "POST",
    })
    const second = await fetch(`${baseUrl}/api/projects/${projectB.id}/invoices`, {
      method: "POST",
    })

    assert.equal(first.status, 201)
    assert.equal(second.status, 201)

    const firstInvoice = (await first.json()) as { invoiceNumber: number }
    const secondInvoice = (await second.json()) as { invoiceNumber: number }

    assert.equal(firstInvoice.invoiceNumber, 2)
    assert.equal(secondInvoice.invoiceNumber, 3)
  })
})
