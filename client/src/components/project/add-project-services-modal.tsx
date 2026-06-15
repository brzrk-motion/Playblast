import { useEffect, useMemo, useState } from "react"
import { Check, Search } from "lucide-react"
import { ServiceTypeBadge } from "@/components/services/service-type-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { addProjectService, listServices } from "@/lib/api"
import { formatCurrency } from "@/lib/budget"
import {
  filterServices,
  formatHourEstimate,
} from "@/lib/services"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { ProjectServiceWithDetails } from "@/types/project-service"
import type { Service } from "@/types/service"

interface AddProjectServicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  attachedServiceIds: Set<string>
  onAdded: (projectService: ProjectServiceWithDetails) => void
}

export function AddProjectServicesModal({
  open,
  onOpenChange,
  projectId,
  attachedServiceIds,
  onAdded,
}: AddProjectServicesModalProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addingSelected, setAddingSelected] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadServices() {
      setLoading(true)
      try {
        const data = await listServices()
        if (!cancelled) {
          setServices(data)
        }
      } catch (err) {
        if (!cancelled) {
          showErrorToast(humanizeApiError(err, "Failed to load services"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadServices()

    return () => {
      cancelled = true
    }
  }, [open])

  const availableServices = useMemo(
    () => services.filter((service) => !attachedServiceIds.has(service.id)),
    [services, attachedServiceIds],
  )

  const filteredServices = useMemo(
    () => filterServices(availableServices, searchQuery),
    [availableServices, searchQuery],
  )

  async function handleAdd(serviceId: string) {
    setAddingIds((current) => new Set(current).add(serviceId))
    try {
      const added = await addProjectService(projectId, { serviceId })
      onAdded(added)
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(serviceId)
        return next
      })
      showSuccessToast(`Added ${added.service.name}`)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to add service"))
    } finally {
      setAddingIds((current) => {
        const next = new Set(current)
        next.delete(serviceId)
        return next
      })
    }
  }

  async function handleAddSelected() {
    if (selectedIds.size === 0) {
      return
    }

    setAddingSelected(true)
    const ids = [...selectedIds]
    let addedCount = 0

    for (const serviceId of ids) {
      setAddingIds((current) => new Set(current).add(serviceId))
      try {
        const added = await addProjectService(projectId, { serviceId })
        onAdded(added)
        addedCount += 1
        setSelectedIds((current) => {
          const next = new Set(current)
          next.delete(serviceId)
          return next
        })
      } catch (err) {
        showErrorToast(humanizeApiError(err, "Failed to add service"))
        break
      } finally {
        setAddingIds((current) => {
          const next = new Set(current)
          next.delete(serviceId)
          return next
        })
      }
    }

    if (addedCount > 0) {
      showSuccessToast(
        addedCount === 1 ? "Added 1 service" : `Added ${addedCount} services`,
      )
    }

    setAddingSelected(false)
  }

  function toggleSelected(serviceId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSearchQuery("")
      setSelectedIds(new Set())
    }
    onOpenChange(nextOpen)
  }

  const isBusy = addingSelected || addingIds.size > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Services</DialogTitle>
          <DialogDescription>
            Browse the catalog and add one or more services to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search services…"
            className="pl-9"
            aria-label="Search services"
          />
        </div>

        <ScrollArea className="max-h-80 rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading services…
            </div>
          ) : filteredServices.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {availableServices.length === 0
                ? "All catalog services are already on this project."
                : "No matching services."}
            </p>
          ) : (
            <div className="divide-y">
              {filteredServices.map((service) => {
                const isSelected = selectedIds.has(service.id)
                const isAdding = addingIds.has(service.id)

                return (
                  <div
                    key={service.id}
                    className="flex items-center gap-3 p-3"
                  >
                    <button
                      type="button"
                      aria-label={`Select ${service.name}`}
                      aria-pressed={isSelected}
                      disabled={isBusy}
                      onClick={() => toggleSelected(service.id)}
                      className={cn(
                        "focus-ring flex size-5 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background",
                      )}
                    >
                      {isSelected ? <Check className="size-3" /> : null}
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">{service.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <ServiceTypeBadge type={service.type} />
                        <span>{formatHourEstimate(service.hourEstimate)} hrs</span>
                        <span>{formatCurrency(service.hourlyRate)}/hr</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => void handleAdd(service.id)}
                    >
                      {isAdding ? <Spinner className="size-4" /> : "Add"}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isBusy}
          >
            Done
          </Button>
          <Button
            type="button"
            disabled={selectedIds.size === 0 || isBusy}
            onClick={() => void handleAddSelected()}
          >
            {addingSelected ? (
              <Spinner className="size-4" />
            ) : (
              `Add selected${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
