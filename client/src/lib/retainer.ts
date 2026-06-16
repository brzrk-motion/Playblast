export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatHours(value: number): string {
  return `${value.toFixed(1)}h`
}

export function formatCycleRange(cycleStart: string, cycleEnd: string): string {
  const start = new Date(`${cycleStart}T00:00:00`)
  const end = new Date(`${cycleEnd}T00:00:00`)

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return `${formatter.format(start)} – ${formatter.format(end)}`
}

export function formatUtilizationPercent(value: number, isOverage: boolean): string {
  if (isOverage) {
    return `${value}%`
  }
  return `${Math.min(value, 100)}%`
}
