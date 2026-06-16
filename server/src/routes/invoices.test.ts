import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-invoices-api-"))
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

async function createProject(id: string, name: string) {
  const response = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name }),
  })
  assert.equal(response.status, 201)
  return response.json() as Promise<{ id: string }>
}

describe("invoices API", () => {
  it("creates, lists, and retrieves invoices with payment tracking", async () => {
    await createProject("invoice-project", "Invoice Project")

    const createResponse = await fetch(
      `${baseUrl}/api/projects/invoice-project/invoices`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: "INV-001",
          issuedAt: "2026-05-01",
          dueDate: "2026-06-01",
          total: 5000,
        }),
      },
    )

    assert.equal(createResponse.status, 201)
    const created = (await createResponse.json()) as {
      id: string
      status: string
      outstandingBalance: number
      amountPaid: number
    }
    assert.equal(created.status, "unpaid")
    assert.equal(created.outstandingBalance, 5000)
    assert.equal(created.amountPaid, 0)

    const listResponse = await fetch(
      `${baseUrl}/api/projects/invoice-project/invoices`,
    )
    assert.equal(listResponse.status, 200)
    const invoices = (await listResponse.json()) as Array<{ id: string }>
    assert.equal(invoices.length, 1)

    const detailResponse = await fetch(`${baseUrl}/api/invoices/${created.id}`)
    assert.equal(detailResponse.status, 200)
    const detail = (await detailResponse.json()) as {
      total: number
      amountPaid: number
      outstandingBalance: number
      payments: unknown[]
      isOverdue: boolean
    }
    assert.equal(detail.total, 5000)
    assert.equal(detail.amountPaid, 0)
    assert.equal(detail.outstandingBalance, 5000)
    assert.equal(detail.payments.length, 0)
    assert.equal(detail.isOverdue, true)

    const paymentResponse = await fetch(
      `${baseUrl}/api/invoices/${created.id}/payments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 2000,
          paidAt: "2026-06-10",
          notes: "Deposit received",
        }),
      },
    )
    assert.equal(paymentResponse.status, 201)
    const paymentBody = (await paymentResponse.json()) as {
      payment: { amount: number }
      invoice: {
        status: string
        amountPaid: number
        outstandingBalance: number
      }
    }
    assert.equal(paymentBody.payment.amount, 2000)
    assert.equal(paymentBody.invoice.status, "partially_paid")
    assert.equal(paymentBody.invoice.amountPaid, 2000)
    assert.equal(paymentBody.invoice.outstandingBalance, 3000)

    const finalPaymentResponse = await fetch(
      `${baseUrl}/api/invoices/${created.id}/payments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 3000,
          paidAt: "2026-06-15",
        }),
      },
    )
    assert.equal(finalPaymentResponse.status, 201)
    const finalBody = (await finalPaymentResponse.json()) as {
      invoice: {
        status: string
        amountPaid: number
        outstandingBalance: number
        isOverdue: boolean
      }
    }
    assert.equal(finalBody.invoice.status, "paid")
    assert.equal(finalBody.invoice.amountPaid, 5000)
    assert.equal(finalBody.invoice.outstandingBalance, 0)
    assert.equal(finalBody.invoice.isOverdue, false)
  })

  it("includes outstanding balance on project and client detail", async () => {
    const clientResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Acme Corp",
        email: "billing@acme.test",
      }),
    })
    assert.equal(clientResponse.status, 201)
    const client = (await clientResponse.json()) as { id: string }

    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "invoice-client-project",
        name: "Client Invoice Project",
        clientId: client.id,
      }),
    })
    assert.equal(projectResponse.status, 201)

    await fetch(`${baseUrl}/api/projects/invoice-client-project/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceNumber: "INV-100",
        issuedAt: "2026-06-01",
        dueDate: "2026-07-01",
        total: 1000,
      }),
    })

    const projectDetailResponse = await fetch(
      `${baseUrl}/api/projects/invoice-client-project`,
    )
    assert.equal(projectDetailResponse.status, 200)
    const projectDetail = (await projectDetailResponse.json()) as {
      outstandingBalance?: number
    }
    assert.equal(projectDetail.outstandingBalance, 1000)

    const clientDetailResponse = await fetch(
      `${baseUrl}/api/clients/${client.id}`,
    )
    assert.equal(clientDetailResponse.status, 200)
    const clientDetail = (await clientDetailResponse.json()) as {
      outstandingBalance?: number
    }
    assert.equal(clientDetail.outstandingBalance, 1000)
  })
})
