import type { Service, ServiceType } from "@/types/service"
import { SERVICE_TYPES } from "@/types/service"

export type ServiceSortField = "name" | "type"
export type SortDirection = "asc" | "desc"

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  static: "Static",
  animated: "Animated",
}

export const SERVICE_TYPE_STYLES: Record<ServiceType, string> = {
  static: "border-border bg-muted text-muted-foreground",
  animated: "border-primary/30 bg-primary/10 text-primary",
}

export function sortServices(
  services: Service[],
  field: ServiceSortField,
  direction: SortDirection,
): Service[] {
  const sorted = [...services]
  const factor = direction === "asc" ? 1 : -1

  sorted.sort((left, right) => {
    switch (field) {
      case "name":
        return (
          factor *
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        )
      case "type": {
        const typeDelta =
          SERVICE_TYPES.indexOf(left.type) - SERVICE_TYPES.indexOf(right.type)
        if (typeDelta !== 0) {
          return factor * typeDelta
        }
        return (
          factor *
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        )
      }
      default:
        return 0
    }
  })

  return sorted
}
