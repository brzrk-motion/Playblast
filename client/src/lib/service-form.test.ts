import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  hasServiceFormErrors,
  validateServiceForm,
} from "./service-form.js"

describe("validateServiceForm", () => {
  const validValues = {
    name: "Hero render",
    hourEstimate: "4.5",
    hourlyRate: "150",
    type: "static" as const,
  }

  it("accepts valid values", () => {
    const errors = validateServiceForm(validValues)
    assert.equal(hasServiceFormErrors(errors), false)
  })

  it("requires name", () => {
    const errors = validateServiceForm({ ...validValues, name: "  " })
    assert.equal(errors.name, "Name is required.")
  })

  it("enforces max name length", () => {
    const errors = validateServiceForm({
      ...validValues,
      name: "x".repeat(101),
    })
    assert.equal(errors.name, "Name must be 100 characters or fewer.")
  })

  it("requires hour estimate greater than zero", () => {
    const errors = validateServiceForm({ ...validValues, hourEstimate: "0" })
    assert.equal(errors.hourEstimate, "Hour estimate must be greater than 0.")
  })

  it("allows at most one decimal place for hour estimate", () => {
    const errors = validateServiceForm({
      ...validValues,
      hourEstimate: "1.25",
    })
    assert.equal(
      errors.hourEstimate,
      "Hour estimate allows at most one decimal place.",
    )
  })

  it("requires hourly rate greater than zero", () => {
    const errors = validateServiceForm({ ...validValues, hourlyRate: "0" })
    assert.equal(errors.hourlyRate, "Hourly rate must be greater than 0.")
  })

  it("requires a valid service type", () => {
    const errors = validateServiceForm({
      ...validValues,
      type: "video" as "static",
    })
    assert.equal(errors.type, "Select a service type.")
  })
})
