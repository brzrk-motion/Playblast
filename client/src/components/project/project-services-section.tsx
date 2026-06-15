import { useCallback, useEffect, useMemo, useState } from "react"
import { Briefcase, Plus, X } from "lucide-react"
import { AddProjectServicesModal } from "@/components/project/add-project-services-modal"
import { ServiceTypeBadge } from "@/components/services/service-type-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listProjectServices,
  removeProjectService,
} from "@/lib/api"
import { formatCurrency } from "@/lib/budget"
import { formatHourEstimate } from "@/lib/services"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { ProjectServiceWithDetails } from "@/types/project-service"

interface ProjectServicesSectionProps {
  projectId: string
}

export function ProjectServicesSection({ projectId }: ProjectServicesSectionProps) {
  const [projectServices, setProjectServices] = useState<ProjectServiceWithDetails[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [removingServiceId, setRemovingServiceId] = useState<string | null>(null)

  const loadProjectServices = useCallback(async () => {
    try {
      const data = await listProjectServices(projectId)
      setProjectServices(data)
      setError(null)
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load project services")
      setError(message)
      showErrorToast(message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false

    async function fetchServices() {
      try {
        const data = await listProjectServices(projectId)
        if (!cancelled) {
          setProjectServices(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load project services")
          setError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchServices()

    return () => {
      cancelled = true
    }
  }, [projectId])

  const attachedServiceIds = useMemo(
    () => new Set(projectServices.map((item) => item.serviceId)),
    [projectServices],
  )

  function handleServiceAdded(added: ProjectServiceWithDetails) {
    setProjectServices((current) => {
      if (current.some((item) => item.serviceId === added.serviceId)) {
        return current
      }
      return [...current, added]
    })
  }

  async function handleRemove(serviceId: string) {
    setRemovingServiceId(serviceId)
    try {
      await removeProjectService(projectId, serviceId)
      setProjectServices((current) =>
        current.filter((item) => item.serviceId !== serviceId),
      )
      showSuccessToast("Service removed from project")
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to remove service"))
    } finally {
      setRemovingServiceId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Services</CardTitle>
              <CardDescription>
                Catalog offerings attached to this project for quoting and
                budgeting.
              </CardDescription>
            </div>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true)
                  void loadProjectServices()
                }}
              >
                Retry
              </Button>
            </div>
          ) : projectServices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <Briefcase className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No services added</p>
                <p className="text-sm text-muted-foreground">
                  Add catalog services to track offerings on this project.
                </p>
              </div>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus />
                Add Service
              </Button>
            </div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {projectServices.map((item) => {
                const { service } = item

                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">{service.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <ServiceTypeBadge type={service.type} />
                        <span>{formatHourEstimate(service.hourEstimate)} hrs</span>
                        <span className="tabular-nums">
                          {formatCurrency(service.hourlyRate)}/hr
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${service.name}`}
                      disabled={removingServiceId !== null}
                      onClick={() => void handleRemove(item.serviceId)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddProjectServicesModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        projectId={projectId}
        attachedServiceIds={attachedServiceIds}
        onAdded={handleServiceAdded}
      />
    </>
  )
}
