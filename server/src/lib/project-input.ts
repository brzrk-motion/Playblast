import type {
  BudgetLineItem,
  ProjectBudget,
  UpdateProjectInput,
} from "../types/index.js"
import { isProjectStatus } from "../types/index.js"

type ParseError = { error: string }

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function parseLineItems(
  value: unknown,
): { lineItems: BudgetLineItem[] } | ParseError {
  if (!Array.isArray(value)) {
    return { error: "budget.lineItems must be an array." }
  }

  const lineItems: BudgetLineItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return { error: "Each budget line item must be an object." }
    }

    const item = raw as Record<string, unknown>
    const label = typeof item.label === "string" ? item.label.trim() : ""
    if (!label) {
      return { error: "Each budget line item requires a label." }
    }

    if (!isFiniteNumber(item.amount) || item.amount < 0) {
      return { error: "Each budget line item requires a non-negative amount." }
    }

    lineItems.push({
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      label,
      amount: item.amount,
      ...(typeof item.category === "string" && item.category
        ? { category: item.category }
        : {}),
    })
  }

  return { lineItems }
}

export function parseProjectBudget(
  value: unknown,
): { budget: ProjectBudget } | ParseError {
  if (!value || typeof value !== "object") {
    return { error: "budget must be an object." }
  }

  const raw = value as Record<string, unknown>

  if (!isFiniteNumber(raw.total) || raw.total < 0) {
    return { error: "budget.total must be a non-negative number." }
  }

  const currency =
    typeof raw.currency === "string" && raw.currency.trim()
      ? raw.currency.trim().toUpperCase()
      : "USD"

  const budget: ProjectBudget = {
    total: raw.total,
    currency,
  }

  if (raw.spent !== undefined && raw.spent !== null) {
    if (!isFiniteNumber(raw.spent) || raw.spent < 0) {
      return { error: "budget.spent must be a non-negative number." }
    }
    budget.spent = raw.spent
  }

  if (raw.lineItems !== undefined) {
    const parsed = parseLineItems(raw.lineItems)
    if ("error" in parsed) {
      return parsed
    }
    if (parsed.lineItems.length > 0) {
      budget.lineItems = parsed.lineItems
    }
  }

  return { budget }
}

function parseNullableTrimmed(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  return undefined
}

export function parseProjectPatch(
  body: unknown,
): { input: UpdateProjectInput } | ParseError {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be an object." }
  }

  const raw = body as Record<string, unknown>
  const input: UpdateProjectInput = {}

  if (raw.name !== undefined) {
    if (typeof raw.name !== "string" || !raw.name.trim()) {
      return { error: "name must be a non-empty string." }
    }
    input.name = raw.name.trim()
  }

  if (raw.status !== undefined) {
    if (!isProjectStatus(raw.status)) {
      return {
        error: "status must be one of: active, on_hold, completed, archived.",
      }
    }
    input.status = raw.status
  }

  if (raw.client !== undefined) input.client = parseNullableTrimmed(raw.client)
  if (raw.description !== undefined)
    input.description = parseNullableTrimmed(raw.description)
  if (raw.startDate !== undefined)
    input.startDate = parseNullableTrimmed(raw.startDate)
  if (raw.endDate !== undefined) input.endDate = parseNullableTrimmed(raw.endDate)

  if (raw.budget !== undefined) {
    if (raw.budget === null) {
      input.budget = null
    } else {
      const parsed = parseProjectBudget(raw.budget)
      if ("error" in parsed) {
        return parsed
      }
      input.budget = parsed.budget
    }
  }

  if (Object.keys(input).length === 0) {
    return { error: "No valid fields to update." }
  }

  return { input }
}
