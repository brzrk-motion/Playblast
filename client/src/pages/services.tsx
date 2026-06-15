import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  MoreHorizontal,
  Plus,
} from "lucide-react"
import { AddServiceModal } from "@/components/services/add-service-modal"
import { EditServiceModal } from "@/components/services/edit-service-modal"
import { ServiceTypeBadge } from "@/components/services/service-type-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createService,
  deleteService,
  listServices,
  updateService,
} from "@/lib/api"
import { formatCurrency } from "@/lib/budget"
import {
  serviceFormToPayload,
  type ServiceFormValues,
} from "@/lib/service-form"
import {
  sortServices,
  type ServiceSortField,
  type SortDirection,
} from "@/lib/services"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { Service } from "@/types/service"

function formatHourEstimate(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

interface SortableTableHeadProps {
  label: string
  field: ServiceSortField
  activeField: ServiceSortField
  direction: SortDirection
  onSort: (field: ServiceSortField) => void
}

function SortableTableHead({
  label,
  field,
  activeField,
  direction,
  onSort,
}: SortableTableHeadProps) {
  const isActive = activeField === field

  return (
    <TableHead>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1.5 px-2 font-medium"
        onClick={() => onSort(field)}
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" />
        )}
      </Button>
    </TableHead>
  )
}

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<ServiceSortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const fetchServices = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) {
      setLoading(true)
    }

    try {
      const data = await listServices()
      setServices(data)
      setError(null)
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load services")
      setError(message)
      showErrorToast(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await listServices()
        if (!cancelled) {
          setServices(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load services")
          setError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const sortedServices = useMemo(
    () => sortServices(services, sortField, sortDirection),
    [services, sortField, sortDirection],
  )

  function handleSort(field: ServiceSortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection("asc")
  }

  function openCreateModal() {
    setFormError(null)
    setAddModalOpen(true)
  }

  function openEditModal(service: Service) {
    setSelectedService(service)
    setFormError(null)
    setEditModalOpen(true)
  }

  async function handleCreate(values: ServiceFormValues) {
    setSubmitting(true)
    setFormError(null)

    try {
      await createService(serviceFormToPayload(values))
      showSuccessToast("Service added")
      setAddModalOpen(false)
      await fetchServices()
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save service")
      setFormError(message)
      showErrorToast(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(values: ServiceFormValues) {
    if (!selectedService) {
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const updated = await updateService(
        selectedService.id,
        serviceFormToPayload(values),
      )
      showSuccessToast("Service updated")
      setEditModalOpen(false)
      setSelectedService(null)
      setServices((current) =>
        current.map((service) =>
          service.id === updated.id ? updated : service,
        ),
      )
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save service")
      setFormError(message)
      showErrorToast(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(service: Service) {
    if (
      !window.confirm(
        `Delete service "${service.name}"? This cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await deleteService(service.id)
      showSuccessToast("Service deleted")
      await fetchServices()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete service"))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="type-page-title">Services</h2>
          <p className="text-muted-foreground">
            Manage your catalog of static and animated offerings with rates and
            hour estimates.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="size-4" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Services</CardTitle>
          <CardDescription>Catalog offerings and rates</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchServices({ showLoading: true })}
              >
                Retry
              </Button>
            </div>
          ) : sortedServices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Briefcase className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No services yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first catalog offering to start quoting work.
                </p>
              </div>
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="size-4" />
                Add Service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Name"
                    field="name"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Type"
                    field="type"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead>Hour estimate</TableHead>
                  <TableHead>Hourly rate</TableHead>
                  <TableHead className="w-[4rem] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <ServiceTypeBadge type={service.type} />
                    </TableCell>
                    <TableCell>{formatHourEstimate(service.hourEstimate)}</TableCell>
                    <TableCell className={cn("tabular-nums")}>
                      {formatCurrency(service.hourlyRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${service.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditModal(service)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void handleDelete(service)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddServiceModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        submitting={submitting}
        error={formError}
        onSubmit={(values) => void handleCreate(values)}
      />

      <EditServiceModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        service={selectedService}
        submitting={submitting}
        error={formError}
        onSubmit={(values) => void handleEdit(values)}
      />
    </div>
  )
}
