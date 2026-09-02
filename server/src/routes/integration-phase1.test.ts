import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import Database from "better-sqlite3"
import type { Server } from "node:http"
import { createApp } from "../app.js"
import { closeDatabase, initDatabase } from "../storage/db.js"
import {
  authHeaders,
  completeStudioSetup,
  setupAdminAccount,
} from "../test/auth-helpers.js"

let tempDir = ""
let dbPath = ""
let server: Server
let baseUrl = ""
let adminCookies: string[] = []
let adminCsrf = ""

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playblast-phase1-qa-"))
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

  process.env.SESSION_SECRET = "phase-one-test-secret-32chars-min"
  process.env.NODE_ENV = "development"

  const admin = await setupAdminAccount(baseUrl)
  adminCookies = admin.cookies
  adminCsrf = admin.csrfToken
  await completeStudioSetup(baseUrl, adminCookies, adminCsrf)
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })

  delete process.env.DB_PATH
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe("Phase 1 integration (BRZ-147–150)", () => {
  it("has consistent invoice, payment, and retainer schema", () => {
    const db = new Database(dbPath)

    const invoiceColumns = db
      .prepare("PRAGMA table_info(invoices)")
      .all()
      .map((row) => (row as { name: string }).name)
    assert.ok(invoiceColumns.includes("projectId"))
    assert.ok(invoiceColumns.includes("invoiceNumber"))
    assert.ok(invoiceColumns.includes("invoiceDate"))
    assert.ok(invoiceColumns.includes("dueDate"))
    assert.ok(invoiceColumns.includes("grandTotal"))
    assert.ok(invoiceColumns.includes("status"))
    assert.ok(invoiceColumns.includes("createdAt"))

    const paymentColumns = db
      .prepare("PRAGMA table_info(invoice_payments)")
      .all()
      .map((row) => (row as { name: string }).name)
    assert.deepEqual(
      ["id", "invoiceId", "amount", "paidAt", "notes", "createdAt"].sort(),
      paymentColumns.sort(),
    )

    const clientColumns = db
      .prepare("PRAGMA table_info(clients)")
      .all()
      .map((row) => (row as { name: string }).name)
    assert.ok(clientColumns.includes("isRetainer"))
    assert.ok(clientColumns.includes("retainerHours"))
    assert.ok(clientColumns.includes("retainerRate"))
    assert.ok(clientColumns.includes("retainerCycleDay"))

    db.close()
  })

  it("wires invoices, payments, retainers, and profitability together", async () => {
    const headers = authHeaders(adminCookies, adminCsrf)
    const readHeaders = authHeaders(adminCookies, adminCsrf, false)

    const clientResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "QA Retainer Client",
        email: "qa@example.test",
        company: "QA Corp",
        isRetainer: true,
        retainerHours: 20,
        retainerRate: 150,
        retainerCycleDay: 15,
      }),
    })
    assert.equal(clientResponse.status, 201)
    const retainerClient = (await clientResponse.json()) as {
      id: string
      isRetainer: boolean
      retainerHours: number
    }
    assert.equal(retainerClient.isRetainer, true)
    assert.equal(retainerClient.retainerHours, 20)

    const nonRetainerResponse = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "QA Standard Client",
        email: "standard@example.test",
      }),
    })
    assert.equal(nonRetainerResponse.status, 201)
    const standardClient = (await nonRetainerResponse.json()) as {
      id: string
      isRetainer?: boolean
      retainerHours?: number
    }
    assert.equal(standardClient.isRetainer, undefined)

    const db = new Database(dbPath)
    const standardRow = db
      .prepare("SELECT isRetainer, retainerHours FROM clients WHERE id = ?")
      .get(standardClient.id) as { isRetainer: number; retainerHours: number | null }
    assert.equal(standardRow.isRetainer, 0)
    assert.equal(standardRow.retainerHours, null)
    db.close()

    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "QA Integration Project",
        clientId: retainerClient.id,
        budget: { total: 10000, currency: "USD" },
      }),
    })
    assert.equal(projectResponse.status, 201)
    const project = (await projectResponse.json()) as { id: string }

    const serviceResponse = await fetch(`${baseUrl}/api/services`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Motion QA",
        hourEstimate: 10,
        hourlyRate: 200,
        type: "animated",
      }),
    })
    assert.equal(serviceResponse.status, 201)
    const service = (await serviceResponse.json()) as { id: string }

    const linkResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/services`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ serviceId: service.id }),
      },
    )
    assert.equal(linkResponse.status, 201)

    const projectDetailResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}`,
      { headers: readHeaders },
    )
    assert.equal(projectDetailResponse.status, 200)
    const projectDetail = (await projectDetailResponse.json()) as {
      servicesEstimate: number
      servicesEstimatedHours: number
      outstandingBalance?: number
    }
    assert.equal(projectDetail.servicesEstimate, 2000)
    assert.equal(projectDetail.servicesEstimatedHours, 10)
    assert.equal(projectDetail.outstandingBalance, undefined)

    const invoiceResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/invoices`,
      { method: "POST", headers },
    )
    assert.equal(invoiceResponse.status, 201)
    const invoice = (await invoiceResponse.json()) as {
      id: string
      grandTotal: number
      status: string
      outstandingBalance: number
      lineItems: Array<{ lineTotal: number }>
    }
    assert.equal(invoice.grandTotal, 2000)
    assert.equal(
      invoice.lineItems.reduce((sum, item) => sum + item.lineTotal, 0),
      2000,
    )
    assert.equal(invoice.status, "unpaid")
    assert.equal(invoice.outstandingBalance, 2000)

    const listResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/invoices`,
      { headers: readHeaders },
    )
    assert.equal(listResponse.status, 200)
    const invoices = (await listResponse.json()) as Array<{ id: string }>
    assert.equal(invoices.length, 1)

    const detailResponse = await fetch(`${baseUrl}/api/invoices/${invoice.id}`, {
      headers: readHeaders,
    })
    assert.equal(detailResponse.status, 200)
    const detail = (await detailResponse.json()) as {
      payments: unknown[]
      grandTotal: number
    }
    assert.equal(detail.grandTotal, 2000)
    assert.equal(detail.payments.length, 0)

    const paymentsListResponse = await fetch(
      `${baseUrl}/api/invoices/${invoice.id}/payments`,
      { headers: readHeaders },
    )
    assert.equal(paymentsListResponse.status, 200)
    const payments = (await paymentsListResponse.json()) as unknown[]
    assert.equal(payments.length, 0)

    const partialPaymentResponse = await fetch(
      `${baseUrl}/api/invoices/${invoice.id}/payments`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ amount: 500, paidAt: "2026-06-01" }),
      },
    )
    assert.equal(partialPaymentResponse.status, 201)
    const partialBody = (await partialPaymentResponse.json()) as {
      invoice: { status: string; outstandingBalance: number }
    }
    assert.equal(partialBody.invoice.status, "partially_paid")
    assert.equal(partialBody.invoice.outstandingBalance, 1500)

    const paymentsAfterPartial = await fetch(
      `${baseUrl}/api/invoices/${invoice.id}/payments`,
      { headers: readHeaders },
    )
    const listedPayments = (await paymentsAfterPartial.json()) as Array<{
      amount: number
    }>
    assert.equal(listedPayments.length, 1)
    assert.equal(listedPayments[0]?.amount, 500)

    const downloadResponse = await fetch(
      `${baseUrl}/api/invoices/${invoice.id}/download`,
      { headers: readHeaders },
    )
    assert.equal(downloadResponse.status, 200)
    assert.equal(downloadResponse.headers.get("content-type"), "application/pdf")
    assert.match(
      downloadResponse.headers.get("content-disposition") ?? "",
      /attachment/i,
    )

    const retainerPatchResponse = await fetch(
      `${baseUrl}/api/clients/${retainerClient.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ retainerHours: 25 }),
      },
    )
    assert.equal(retainerPatchResponse.status, 200)
    const patchedRetainer = (await retainerPatchResponse.json()) as {
      retainerHours: number
    }
    assert.equal(patchedRetainer.retainerHours, 25)

    const clientDetailResponse = await fetch(
      `${baseUrl}/api/clients/${retainerClient.id}`,
      { headers: readHeaders },
    )
    assert.equal(clientDetailResponse.status, 200)
    const clientDetail = (await clientDetailResponse.json()) as {
      retainerSummary?: { hoursContracted: number }
      outstandingBalance?: number
    }
    assert.equal(clientDetail.retainerSummary?.hoursContracted, 25)
    assert.equal(clientDetail.outstandingBalance, 1500)

    const projectAfterPayment = await fetch(
      `${baseUrl}/api/projects/${project.id}`,
      { headers: readHeaders },
    )
    const projectAfterPaymentBody = (await projectAfterPayment.json()) as {
      outstandingBalance: number
    }
    assert.equal(projectAfterPaymentBody.outstandingBalance, 1500)
  })
})
