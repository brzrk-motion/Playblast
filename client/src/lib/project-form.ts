import type { ProjectStatus } from "@/types/project"

export interface ProjectFormValues {
  name: string
  clientId: string | null
  description: string
  status: ProjectStatus
  startDate: string
  endDate: string
  budgetTotal: string
  budgetSpent: string
  currency: string
}

export function projectFormToPayload(values: ProjectFormValues) {
  const total = values.budgetTotal.trim()
    ? Number(values.budgetTotal)
    : undefined
  const spent = values.budgetSpent.trim() ? Number(values.budgetSpent) : undefined

  const budget =
    total !== undefined && Number.isFinite(total)
      ? {
          total,
          currency: values.currency.trim() || "USD",
          ...(spent !== undefined && Number.isFinite(spent) ? { spent } : {}),
        }
      : null

  return {
    name: values.name.trim(),
    clientId: values.clientId,
    description: values.description.trim() || null,
    status: values.status,
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    budget,
  }
}
